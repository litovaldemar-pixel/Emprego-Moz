import * as express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import multer from "multer";
import * as pdfParseModule from "pdf-parse";
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

async function createPdfBuffer(title: string, content: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.fontSize(18).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(content);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const upload = multer({ storage: multer.memoryStorage() });

  app.post("/api/upload-cv", upload.single("cvfile"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum ficheiro fornecido." });
      }
      const pdfData = await pdfParse(req.file.buffer);
      // Clean up multiple line breaks often found in PDF extraction
      const cleanText = pdfData.text.replace(/\n\s*\n/g, '\n').trim();
      res.json({ text: cleanText, filename: req.file.originalname });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Falha ao analisar o PDF." });
    }
  });

  // Define some mock jobs for Mozambique
  const MOCK_JOBS = [
    {
      id: "1",
      title: "Senior React Developer",
      company: "Vodacom Moçambique",
      location: "Maputo",
      source: "LinkedIn",
      datePosted: "Hoje",
      description: "Estamos à procura de um desenvolvedor React experiente para integrar a nossa equipa de engenharia. Requisitos: 5+ anos de experiência, profundo conhecimento de React, TypeScript, e consumo de APIs REST. Enviar currículo para rh@vodacom.co.mz",
      matchScore: 85,
      category: "TI & Software",
      contactEmail: "rh@vodacom.co.mz"
    },
    {
      id: "2",
      title: "Logistics Coordinator",
      company: "World Food Programme",
      location: "Beira",
      source: "UN Jobs",
      datePosted: "Ontem",
      description: "Coordenação de supply chain e logística de distribuição alimentar na região centro. Experiência em procurement e gestão de rotas. Candidaturas via candidaturas@wfp.org",
      matchScore: 92,
      category: "Logística",
      contactEmail: "candidaturas@wfp.org"
    },
    {
      id: "3",
      title: "Engenheiro de Minas",
      company: "Vale Moçambique",
      location: "Tete",
      source: "Emprego.co.mz",
      datePosted: "Há 2 dias",
      description: "Responsável pelo planeamento operacional mineiro. Necessário licenciatura em Engenharia de Minas e registo na Ordem dos Engenheiros de Moçambique. recrutamento@vale.co.mz",
      matchScore: 45,
      category: "Engenharia",
      contactEmail: "recrutamento@vale.co.mz"
    },
    {
      id: "4",
      title: "Gestor de Recursos Humanos",
      company: "Standard Bank",
      location: "Maputo",
      source: "MMO Emprego",
      datePosted: "Há 3 dias",
      description: "Gestão do ciclo de vida dos colaboradores, recrutamento e desenvolvimento de talentos no sector bancário. hr@standardbank.co.mz",
      matchScore: 60,
      category: "Recursos Humanos",
      contactEmail: "hr@standardbank.co.mz"
    }
  ];

  app.get("/api/jobs", (req, res) => {
    res.json(MOCK_JOBS);
  });

  app.get("/api/jobs/scan", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback for scanning when no API key
        return res.json([
          {
            id: `mock_scan_${Date.now()}`,
            title: "Desenvolvedor Backend Pleno",
            company: "Tech Moçambique",
            location: "Nampula",
            source: "LinkedIn",
            datePosted: "Agora mesmo",
            description: "Esta é uma vaga simulada porque a chave API Gemini não está configurada neste ambiente. Procuramos um programador experiente.",
            matchScore: 95,
            category: "TI & Software",
            contactEmail: "recrutamento@tech.co.mz"
          },
          {
            id: `mock_scan_2_${Date.now()}`,
            title: "Auditor Financeiro",
            company: "KPMG MZ",
            location: "Maputo",
            source: "Emprego.co.mz",
            datePosted: "Há 1h",
            description: "Esta é outra vaga simulada gerada como demonstração de dados.",
            matchScore: 88,
            category: "Finanças",
            contactEmail: "rh@kpmg.co.mz"
          }
        ]);
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Faz uma pesquisa na web (Google Search) APENAS por vagas de emprego recentes e REAIS disponíveis hoje em Moçambique (ex: Maputo, Beira, etc).
        Procura em portais de emprego moçambicanos ou LinkedIn.
        Devolve o resultado ESTRITAMENTE num formato JSON que seja um ARRAY de objectos com a seguinte estrutura:
        [
          {
            "id": "gerar_um_id_unico",
            "title": "Título da Vaga",
            "company": "Nome da Empresa",
            "location": "Localização",
            "source": "Fonte (ex: LinkedIn, Emprego.co.mz)",
            "datePosted": "Data (ex: Hoje, Há 2 dias)",
            "description": "Resumo da vaga e requisitos",
            "matchScore": 0,
            "category": "Uma das seguintes: Administração, Contabilidade, Agronegócios / Agricultura, Finanças, Sector Bancário, TI & Software, Logística, Engenharia, Recursos Humanos",
            "contactEmail": "email rh (ou inventar um simulado caso não tenha)"
          }
        ]
        Não incluas texto fora do JSON array (nem markdown formating se possível ou remove-o). Trás pelo menos 5 vagas reais e actuais.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            temperature: 0.2
        }
      });

      let text = response.text || "";
      // Clean up markdown code blocks if any
      if (text.includes("\`\`\`json")) {
          text = text.split("\`\`\`json")[1].split("\`\`\`")[0].trim();
      } else if (text.includes("\`\`\`")) {
          text = text.split("\`\`\`")[1].split("\`\`\`")[0].trim();
      }

      const jobs = JSON.parse(text);
      res.json(jobs);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Erro na varredura." });
    }
  });

  // Example endpoint to use Gemini to generate a tailored cover letter / analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { cv, jobDescription } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          matchScore: Math.floor(Math.random() * 40) + 50,
          analysis: "Chave API não configurada no servidor. Esta é uma mensagem gerada automaticamente como fallback. Destacaríamos as suas valências face aos requisitos da vaga.",
          coverLetter: "Caro recrutador,\n\nAgradeço a oportunidade. Anexo envio o meu currículo para apreciação.\n\nCom os melhores cumprimentos.",
          adaptedCV: "Resumo adaptado com foco em requisitos fictícios para a vaga, destacando as suas experiências principais de forma objectiva e alinhada à empresa."
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Analisa a compatibilidade do seguinte CV para a vaga descrita.
        Responde exclusivamente no formato JSON com 4 campos:
        1. "matchScore" (um número de 1 a 100)
        2. "analysis" (um parágrafo curto com o porquê da pontuação)
        3. "coverLetter" (uma pequena carta de apresentação gerada a partir do CV e focada nos requisitos da vaga).
        4. "adaptedCV" (um texto com o Resumo Profissional e Competências reescritos/adaptados especificamente para fazer 'match' com as palavras-chave desta vaga).

        VAGA:
        ${jobDescription}

        CV DO CANDIDATO:
        ${cv}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const responseText = response.text;
      
      if(responseText) {
        let result = JSON.parse(responseText);
        res.json(result);
      } else {
        res.status(500).json({ error: "Failed to generate content." });
      }

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Erro no processamento da API." });
    }
  });


  app.post("/api/apply", async (req, res) => {
    try {
      const { jobId, email, coverLetter, cv } = req.body;
      
      if (!email) {
         return res.status(400).json({ error: "Email de destino não encontrado na vaga." });
      }

      // Generate PDFs
      const cvBuffer = await createPdfBuffer("Curriculum Vitae Adaptado", cv);
      const coverBuffer = await createPdfBuffer("Carta de Apresentacao", coverLetter);

      // Create test account automatically
      const testAccount = await nodemailer.createTestAccount();

      const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, 
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await transporter.sendMail({
        from: '"EmpregaMoz AI" <bot@empregamoz.co.mz>',
        to: email,
        subject: `Candidatura Automática via EmpregaMoz AI`,
        text: `Caro Recrutador,\n\nSegue em anexo o meu CV e Carta de Apresentação.\n\nCom os melhores cumprimentos.`,
        attachments: [
          {
            filename: 'CV_Adaptado.pdf',
            content: cvBuffer,
            contentType: 'application/pdf'
          },
          {
            filename: 'Carta_Apresentacao.pdf',
            content: coverBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      
      res.json({ 
        success: true, 
        message: `Candidatura enviada via Ethereal Mail! Clique aqui para ver os PDFs gerados e o email falso.`,
        previewUrl
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Erro ao submeter candidatura." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Simulacao de Cron Job para Agente Autonomo
  setInterval(() => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CRON JOB] Varrendo vagas no LinkedIn e MMO.co.mz...`);
    console.log(`[${timestamp}] [CRON JOB] Em avaliacao de MatchScore >= 85% para utilizadores subscritos...`);
  }, 120000); // 2 minutes
}

startServer();
