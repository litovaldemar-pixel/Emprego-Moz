export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  datePosted: string;
  description: string;
  matchScore: number;
  category?: string;
  contactEmail?: string;
}

export interface AppliedJob {
  job: Job;
  dateApplied: string;
  status: 'Enviado' | 'Entrevista' | 'Rejeitado';
  previewUrl?: string;
}

export interface UserProfile {
  name: string;
  role: string;
  experience: string;
  skills: string;
  linkedIn?: string;
  documents?: { name: string; type: string }[];
}
