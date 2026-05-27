import { useState, useEffect, type ReactNode } from "react";
import type React from "react";
import { Briefcase, FileText, Bot, UserCircle, Search, LogOut, Loader2, Play, CheckCircle, Linkedin, UploadCloud, Trash2, Mail, History, ExternalLink, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import type { Job, UserProfile, AppliedJob } from "./types";
import { auth, db } from "./lib/firebase";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, query, onSnapshot, addDoc, setDoc, serverTimestamp, orderBy, getDocs } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./lib/firestore-error-handler";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "jobs" | "cv" | "history">("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userCV, setUserCV] = useState("Profissional de tecnologias com experiência em React, Python e coordenação de projectos. Licenciatura concluída. Fluente em Português e Inglês, residente em Maputo.");
  const [autoApply, setAutoApply] = useState(false);
  const [appliedHistory, setAppliedHistory] = useState<AppliedJob[]>([]);
  const [userDocs, setUserDocs] = useState<{id: string, name: string, type: string}[]>([
     {id: "1", name: "MEU_CV_ACTUALIZADO.pdf", type: "Documento Principal (CV)"},
     {id: "2", name: "BI_FRENTE_VERSO.pdf", type: "Documento de Identificação"}
  ]);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
       setAppliedHistory([]);
       setUserCV("Profissional de tecnologias com experiência em React, Python e coordenação de projectos. Licenciatura concluída. Fluente em Português e Inglês, residente em Maputo.");
       return;
    }
    
    // Fetch User Profile (CV)
    const profileUnsub = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
       if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.cvData) setUserCV(data.cvData);
          if (typeof data.autoApply === 'boolean') setAutoApply(data.autoApply);
          if (data.documents) setUserDocs(data.documents);
       }
    }, (error) => {
       console.error("Profile Fetch Error: ", error);
    });

    const q = query(
      collection(db, "users", user.uid, "appliedJobs"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const history: AppliedJob[] = [];
      snapshot.forEach(doc => {
         const data = doc.data();
         history.push({
           job: {
             id: doc.id,
             title: data.jobTitle,
             company: data.jobCompany,
             location: data.jobLocation,
             description: "",
             matchScore: 0,
             source: "EmpregaMoz AI",
             datePosted: "",
           },
           dateApplied: data.dateApplied,
           status: data.status,
           previewUrl: data.previewUrl
         });
      });
      setAppliedHistory(history);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/appliedJobs`);
    });
    return () => {
       unsub();
       profileUnsub();
    };
  }, [user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setAuthError(err.message || "Ocorreu um erro na autenticação. Verifique os seus dados.");
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
       console.error(e);
    }
  };

  if (authLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC]">
       <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>;
  }

  if (!user) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC] items-center justify-center p-6 text-center">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
        >
          <div className="bg-primary-600 p-3 rounded-xl mx-auto w-12 h-12 flex items-center justify-center mb-6">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">EmpregaMoz AI</h1>
          <p className="text-slate-500 mb-6">Inicie sessão ou crie uma nova conta para suportar vários utilizadores simultaneamente.</p>
          
          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            {authError && <div className="text-red-500 text-xs bg-red-50 border border-red-100 p-2 rounded text-left"><span className="font-semibold">Erro:</span> {authError}</div>}
            <input 
              type="email" 
              placeholder="E-mail (ex: ana@teste.com)" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-11 px-3 border border-slate-300 rounded-lg outline-none focus:border-primary-500 text-left" 
              required
            />
            <input 
              type="password" 
              placeholder="Palavra-passe (mín. 6 caracteres)" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-11 px-3 border border-slate-300 rounded-lg outline-none focus:border-primary-500 text-left" 
              required
            />
            <button 
              type="submit"
              className="w-full h-11 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition"
            >
              {isLoginMode ? "Entrar com Email" : "Registar Nova Conta"}
            </button>
            <button 
              type="button"
              onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(""); }}
              className="text-sm font-medium text-primary-600 hover:underline w-full mt-2"
            >
              {isLoginMode ? "Não tem conta? Registe-se" : "Já tem conta? Inicie sessão"}
            </button>
          </form>

          <div className="relative flex items-center py-2 mb-4">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">ou</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button 
             onClick={handleLogin}
             className="w-full h-11 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition"
          >
             Entrar com o Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 72 }}
        className="bg-white border-r border-slate-200 shadow-sm flex flex-col z-20 flex-shrink-0"
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="bg-primary-600 p-1.5 rounded-lg shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-slate-800 text-lg whitespace-nowrap"
              >
                EmpregaMoz AI
              </motion.span>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 flex flex-col gap-2">
          <NavItem
            icon={<Briefcase />}
            label="Dashboard"
            isActive={activeTab === "dashboard"}
            isOpen={isSidebarOpen}
            onClick={() => setActiveTab("dashboard")}
          />
          <NavItem
            icon={<Search />}
            label="Procurar Vagas"
            isActive={activeTab === "jobs"}
            isOpen={isSidebarOpen}
            onClick={() => setActiveTab("jobs")}
          />
          <NavItem
            icon={<History />}
            label="Minhas Candidaturas"
            isActive={activeTab === "history"}
            isOpen={isSidebarOpen}
            onClick={() => setActiveTab("history")}
          />
          <NavItem
            icon={<FileText />}
            label="Meu Perfil / CV"
            isActive={activeTab === "cv"}
            isOpen={isSidebarOpen}
            onClick={() => setActiveTab("cv")}
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center justify-between gap-3 group">
            <div className="flex items-center gap-3 overflow-hidden">
               <UserCircle className="w-10 h-10 text-slate-400 shrink-0" />
               {isSidebarOpen && (
                 <div className="flex flex-col overflow-hidden">
                   <span className="text-sm font-semibold text-slate-700 truncate">{user.displayName || "Candidato"}</span>
                   <span className="text-xs text-slate-500 truncate">Moçambique</span>
                 </div>
               )}
            </div>
            {isSidebarOpen && (
               <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-slate-700 transition" title="Terminar sessão">
                  <LogOut className="w-4 h-4"/>
               </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto w-full relative">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && <DashboardView key="dashboard" navigateTo={setActiveTab} autoApply={autoApply} />}
          {activeTab === "jobs" && (
            <JobsView 
               key="jobs" 
               cvData={userCV} 
               user={user}
            />
          )}
          {activeTab === "history" && <HistoryView key="history" history={appliedHistory} />}
          {activeTab === "cv" && <ProfileView key="cv" cvData={userCV} setCvData={setUserCV} user={user} autoApply={autoApply} setAutoApply={setAutoApply} docs={userDocs} setDocs={setUserDocs} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  isActive,
  isOpen,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full group relative",
        isActive
          ? "bg-primary-50 text-primary-600 font-medium"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
      title={isOpen ? "" : label}
    >
      <div className={cn("w-5 h-5", isActive ? "text-primary-600" : "text-slate-400 group-hover:text-slate-600")}>
        {icon}
      </div>
      {isOpen && <span className="whitespace-nowrap">{label}</span>}
      {!isOpen && isActive && (
         <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 rounded-r-full" />
      )}
    </button>
  );
}

function DashboardView({ navigateTo, autoApply }: { navigateTo: (tab: "jobs") => void; autoApply: boolean; key?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="p-6 md:p-10 max-w-5xl mx-auto"
    >
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Resumo da Semana</h1>
        <p className="text-slate-500 mt-1">Bem-vindo(a) de volta! O assistente esteve à procura de oportunidades.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Vagas Encontradas" value="124" trend="+14 hoje" icon={<Search className="text-blue-500" />} />
        <StatCard title="Candidaturas" value="12" trend="Automáticas" icon={<Bot className="text-primary-500" />} />
        <StatCard title="Entrevistas" value="2" trend="Brevemente" icon={<Briefcase className="text-emerald-500" />} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 flex flex-col md:flex-row items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Auto-Submissão Inteligente</h2>
            <p className="text-slate-500 text-sm mt-1">A nossa IA verifica portais como Emprego.co.mz e LinkedIn e aplica o seu CV adaptado a cada vaga.</p>
          </div>
          <button 
             onClick={() => navigateTo("jobs")}
             className="mt-4 md:mt-0 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2">
            Ver Vagas <Play className="w-4 h-4" fill="currentColor" />
          </button>
        </div>
        <div className="p-8 text-center bg-slate-50/50">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4 relative z-0">
            <CheckCircle className="w-8 h-8 text-emerald-600 relative z-10" />
            {autoApply && <span className="absolute inset-0 flex items-center justify-center w-full h-full"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span></span>}
          </div>
          <h3 className="text-slate-800 font-semibold mb-2">
            {autoApply ? "Agente Autónomo Activo em Moçambique" : "Monitorização Activa em Moçambique"}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm">
            {autoApply ? "O nosso cron job no servidor está sempre activo. Caso alguma vaga tenha MatchScore superior a 85%, o bot extrai o seu PDF, envia automaticamente para os RH e alerta-o via email." : "O EmpregaMoz AI está a varrer as 10 principais fontes de emprego do país, comparando com as suas preferências e utilizando a IA para destacar a sua experiência em Maputo e noutras províncias."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, trend, icon }: { title: string; value: string; trend: string; icon: ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">{icon}</div>
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>
      </div>
      <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

function ProfileView({ cvData, setCvData, user, autoApply, setAutoApply, docs, setDocs }: { cvData?: string, setCvData?: (val: string) => void, user: User, autoApply: boolean, setAutoApply: (val: boolean) => void, docs: {id: string, name: string, type: string}[], setDocs: (val: any) => void, key?: string }) {
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     
     setUploading(true);
     const formData = new FormData();
     formData.append("cvfile", file);
     
     try {
       const res = await fetch("/api/upload-cv", { method: "POST", body: formData });
       const data = await res.json();
       if (res.ok) {
         if (setCvData) setCvData(data.text);
       } else {
         alert("Erro: " + data.error);
       }
     } catch (err) {
       console.error(err);
       alert("Ocorreu um erro ao enviar o PDF");
     } finally {
       setUploading(false);
       if(e.target) e.target.value = '';
     }
  };

  const handleSave = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsSaving(true);
     try {
       await setDoc(doc(db, "users", user.uid), {
         cvData: cvData,
         autoApply: autoApply,
         documents: docs,
         userId: user.uid
       }, { merge: true });
       setSaved(true);
       setTimeout(() => setSaved(false), 3000);
     } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
       alert("Erro ao guardar perfil");
     } finally {
       setIsSaving(false);
     }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="p-6 md:p-10 max-w-3xl mx-auto"
    >
       <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">O Meu Perfil </h1>
        <p className="text-slate-500 mt-1">Os seus dados base para o motor de IA gerar candidaturas hiper-personalizadas.</p>
      </header>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <form className="space-y-6" onSubmit={handleSave}>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-emerald-200 bg-emerald-50 rounded-xl mb-6">
             <div className="mb-4 md:mb-0">
                 <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2"><Bot className="w-4 h-4" /> Agente Autónomo de Candidatura</h3>
                 <p className="text-xs text-emerald-700 mt-1 max-w-lg">Se activado, um Cron Job no servidor verificará vagas. Se o MatchScore for &gt; 85%, fará a candidatura autónoma enviando o seu CV actual.</p>
             </div>
             <label className="relative inline-flex items-center cursor-pointer shrink-0">
               <input type="checkbox" className="sr-only peer" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} />
               <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 border border-slate-300 peer-checked:border-emerald-600"></div>
             </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nome Completo</label>
              <input type="text" defaultValue="Valdemar" className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Função Desejada</label>
              <input type="text" defaultValue="Desenvolvedor / Gestor de IT" className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Resumo Profissional (IA Context)</label>
            <textarea 
              rows={4}
              value={cvData}
              onChange={(e) => setCvData && setCvData(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" 
            />
          </div>

          <div className="space-y-1.5">
             <label className="text-sm font-medium text-slate-700">Competências Chave (Keywords)</label>
             <input type="text" defaultValue="React, Node.js, Python, Gestão de Projectos, Supply Chain" className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
          </div>

          <div className="space-y-1.5">
             <label className="text-sm font-medium text-slate-700">Link do LinkedIn</label>
             <div className="relative">
               <Linkedin className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
               <input type="url" placeholder="https://linkedin.com/in/seu-perfil" className="w-full h-10 pl-10 pr-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
             </div>
          </div>

          <div className="space-y-1.5">
             <label className="text-sm font-medium text-slate-700">Documentos Anexos (Parse Real do PDF via Multer + PDF-Parse)</label>
             <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-slate-50 transition relative overflow-hidden group">
               <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
               {uploading ? (
                 <>
                   <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-2" />
                   <p className="text-sm font-medium text-primary-700">A Extrair Texto do PDF e Carregar Variáveis...</p>
                 </>
               ) : (
                 <>
                   <div className="w-full absolute inset-0 bg-primary-50/0 group-hover:bg-primary-50/50 transition duration-300" />
                   <UploadCloud className="w-8 h-8 text-slate-400 mb-2 group-hover:text-primary-500 transition relative z-10" />
                   <p className="text-sm font-medium text-slate-700 group-hover:text-primary-700 transition relative z-10">Clique para Carregar Actual CV (PDF)</p>
                   <p className="text-xs text-slate-500 mt-1 max-w-sm relative z-10">O texto será extraído em Node.js e reconstruído magicamente pela IA no seu Resumo Profissional.</p>
                 </>
               )}
             </label>
             
             {/* Mock uploaded files */}
             <div className="mt-4 space-y-2">
                {docs.map((docItem) => (
                  <div key={docItem.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                     <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{docItem.name}</p>
                          <p className="text-xs text-slate-500">{docItem.type}</p>
                        </div>
                     </div>
                     <button 
                       type="button" 
                       onClick={async () => {
                          const newDocs = docs.filter(d => d.id !== docItem.id);
                          setDocs(newDocs);
                          await setDoc(doc(db, "users", user.uid), { documents: newDocs }, { merge: true });
                       }}
                       className="text-slate-400 hover:text-red-500 transition"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                ))}
             </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium flex items-center gap-2">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saved ? "Gravado!" : "Guardar Perfil"}
            </button>
          </div>
        </form>
      </div>

    </motion.div>
  );
}

function JobsView({ cvData = "Profissional de tecnologias com experiência em React, Python e coordenação de projectos. Licenciatura concluída. Fluente em Português e Inglês, residente em Maputo.", user }: { cvData?: string; user: User; key?: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [expandedDesc, setExpandedDesc] = useState<string | null>(null);

  // Modal state
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/jobs")
      .then(res => res.json())
      .then(data => {
        setJobs(data);
        setLoading(false);
      });
  }, []);

  const handleScanRealTime = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/jobs/scan");
      if (res.ok) {
        const data = await res.json();
        // Calculate mock match scores for new jobs randomly or set defaults
        const formattedData = data.map((j: any) => ({
           ...j, 
           matchScore: j.matchScore || Math.floor(Math.random() * 40) + 50
        }));
        setJobs(formattedData);
      } else {
        alert("Erro ao efectuar varredura.");
      }
    } catch(e) {
      console.error(e);
      alert("Erro de servidor.");
    } finally {
      setScanning(false);
    }
  };

  const handleApply = async (job: Job) => {
    setApplyingJobId(job.id);
    
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv: cvData, jobDescription: job.description })
      });
      const result = await res.json();
      setAnalysisResult({ ...result, job });
      setSuccessMessage(null); // reset alert in modal
      setPreviewUrl(null);
    } catch (e) {
      console.error(e);
    } finally {
      setApplyingJobId(null);
    }
  };

  const predefinedCategories = [
    "Administração", 
    "Contabilidade", 
    "Agronegócios / Agricultura", 
    "Finanças", 
    "Sector Bancário",
    "TI & Software",
    "Logística",
    "Engenharia",
    "Recursos Humanos"
  ];
  
  const filteredJobs = selectedCategory === "Todas" ? jobs : jobs.filter(j => j.category === selectedCategory);
  const categories = ["Todas", ...Array.from(new Set([...predefinedCategories, ...jobs.map(j => j.category).filter(Boolean)]))];

  const handleApplyEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          jobId: analysisResult.job.id, 
          email: analysisResult.job.contactEmail || "rh@empresa.com",
          coverLetter: analysisResult.coverLetter,
          cv: analysisResult.adaptedCV || "Sem CV adaptado na resposta."
        })
      });
      const data = await res.json();
      if(data.success) {
         setSuccessMessage(data.message);
         if (data.previewUrl) setPreviewUrl(data.previewUrl);
         
         try {
            await addDoc(collection(db, "users", user.uid, "appliedJobs"), {
              jobTitle: analysisResult.job.title,
              jobCompany: analysisResult.job.company,
              jobLocation: analysisResult.job.location,
              userId: user.uid,
              dateApplied: new Date().toLocaleDateString('pt-PT'),
              status: "Enviado",
              previewUrl: data.previewUrl,
              createdAt: serverTimestamp()
            });
         } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/appliedJobs`);
         }
      } else {
         alert("Erro: " + data.error);
      }
    } catch(e) {
       console.error(e);
       alert("Erro de servidor ao enviar email.");
    } finally {
       setSendingEmail(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="p-6 md:p-10 max-w-5xl mx-auto relative"
    >
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Vagas e Oportunidades</h1>
          <p className="text-slate-500 mt-1">O feed centralizado das principais fontes de Moçambique.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:border-primary-500 w-full md:w-auto"
          >
            {categories.map(cat => <option key={cat as string} value={cat as string}>{cat}</option>)}
          </select>

          <button 
             onClick={handleScanRealTime}
             disabled={scanning || loading}
             className="h-10 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 whitespace-nowrap shadow-sm w-full md:w-auto"
          >
             {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
             {scanning ? " A pesquisar web..." : "Varredura Tempo Real"}
          </button>
        </div>
      </header>

      {loading ? (
         <div className="py-20 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
         </div>
      ) : filteredJobs.length === 0 ? (
         <div className="py-16 text-center bg-white rounded-xl border border-slate-200 shadow-sm mt-4">
            <div className="inline-flex w-12 h-12 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="text-slate-800 font-semibold">Nenhuma vaga encontrada</h3>
            <p className="text-slate-500 text-sm mt-1">Tente mudar a categoria de filtragem ou efectuar nova varredura web.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map(job => (
            <div key={job.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-start gap-6">
              
               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-2">
                   <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md uppercase tracking-wider">{job.source}</span>
                   {job.category && <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md uppercase tracking-wider">{job.category}</span>}
                   <span className="text-xs text-slate-400">{job.datePosted}</span>
                 </div>
                 <h3 className="font-bold text-lg text-slate-900">{job.title}</h3>
                 <p className="text-slate-600 font-medium text-sm mt-0.5">{job.company} • {job.location}</p>
                 <div className="mt-3">
                   <p className={cn("text-slate-500 text-sm transition-all", expandedDesc !== job.id ? "line-clamp-2" : "whitespace-pre-wrap")}>{job.description}</p>
                   <button onClick={() => setExpandedDesc(expandedDesc === job.id ? null : job.id)} className="text-primary-600 font-medium text-xs mt-1.5 hover:underline">
                      {expandedDesc === job.id ? "Recolher Descrição" : "Ler Toda Descrição"}
                   </button>
                 </div>
               </div>

               <div className="flex md:flex-col items-center justify-between md:justify-start gap-4 md:gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 w-full md:w-32 shrink-0">
                  <div className="text-center w-full md:mt-2">
                    <div className="text-2xl font-bold text-emerald-600">{job.matchScore}%</div>
                    <div className="text-xs text-slate-500 font-medium tracking-wide">MATCH CV</div>
                  </div>
                  <button
                    onClick={() => handleApply(job)}
                    disabled={applyingJobId === job.id}
                    className="h-10 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg font-medium transition flex items-center justify-center w-full shadow-sm text-sm"
                  >
                    {applyingJobId === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Auto Aplicar"}
                  </button>
               </div>

            </div>
          ))}
        </div>
      )}

      {/* Modal Result Analysis */}
      <AnimatePresence>
        {analysisResult && (
          <>
            <motion.div
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
               onClick={() => setAnalysisResult(null)}
            />
            <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl bg-white rounded-2xl shadow-xl z-50 p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
               <h3 className="text-xl font-bold text-slate-900 mb-2">Simulação de Auto-Candidatura</h3>
               <p className="text-sm text-slate-500 mb-6">O bot adaptou o seu perfil à vaga de <strong className="text-slate-700">{analysisResult.job.title}</strong> na {analysisResult.job.company}.</p>
               
               <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                       <Bot className="w-4 h-4 text-emerald-600"/> Análise de IA do Match ({analysisResult.matchScore}%)
                    </p>
                    <p className="text-sm text-slate-600">{analysisResult.analysis}</p>
                  </div>

                  {analysisResult.adaptedCV && (
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                      <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600"/> CV Adaptado pela IA
                      </p>
                      <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">{analysisResult.adaptedCV}</p>
                    </div>
                  )}
                  
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Carta de Apresentação Gerada</p>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-serif">"{analysisResult.coverLetter}"</p>
                  </div>
               </div>

               <div className="mt-8">
                  {successMessage ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-xl flex flex-col gap-3">
                       <div className="flex items-center gap-3">
                         <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                         <p className="text-sm font-medium">{successMessage}</p>
                       </div>
                       {previewUrl && (
                         <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="ml-9 inline-flex items-center justify-center h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition self-start shadow-sm">
                           Visualizar Email e PDFs enviados
                         </a>
                       )}
                    </div>
                  ) : (
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setAnalysisResult(null)} className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 transition flex-shrink-0">Cancelar</button>
                      <button 
                        onClick={handleApplyEmail} 
                        disabled={sendingEmail}
                        className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 w-full md:w-auto"
                      >
                       {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                       {sendingEmail ? "A preparar ficheiros PDF..." : `Anexar PDFs e Enviar para ${analysisResult.job.contactEmail || "RH"}`}
                      </button>
                    </div>
                  )}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

function HistoryView({ history }: { history: AppliedJob[]; key?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="p-6 md:p-10 max-w-5xl mx-auto relative"
    >
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Histórico de Candidaturas</h1>
           <p className="text-slate-500 mt-1">Gira e acompanhe os processos para onde já remeteu CV e Carta de Apresentação.</p>
        </div>
      </header>

      {history.length === 0 ? (
         <div className="py-16 text-center bg-white rounded-xl border border-slate-200 shadow-sm mt-4">
            <div className="inline-flex w-16 h-16 rounded-full bg-slate-50 border border-slate-100 items-center justify-center mb-4">
              <History className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg text-slate-800 font-semibold">Sem Candidaturas</h3>
            <p className="text-slate-500 mt-1">As candidaturas submetidas pela IA aparecerão aqui.</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 gap-4">
            {history.map((item, idx) => (
               <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-6">
                 <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="text-sm font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 uppercase tracking-wi">
                          {item.status}
                       </span>
                       <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {item.dateApplied}</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">{item.job.title}</h3>
                    <p className="text-slate-600 font-medium text-sm mt-0.5">{item.job.company} • {item.job.location}</p>
                 </div>
                 
                 {item.previewUrl && (
                    <div className="shrink-0 flex items-center md:pl-6 md:border-l border-slate-100 mt-4 md:mt-0">
                       <a href={item.previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg text-sm transition shadow-sm border border-indigo-200">
                          <ExternalLink className="w-4 h-4" /> Ver PDFs e Email
                       </a>
                    </div>
                 )}
               </div>
            ))}
         </div>
      )}
    </motion.div>
  );
}
