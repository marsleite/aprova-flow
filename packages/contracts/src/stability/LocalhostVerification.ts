export type VerificationStatus = 'pass' | 'fail' | 'blocked';

export type VerificationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface LocalhostVerificationResult {
  surface: string;
  path: string;
  precondition: string;
  action: string;
  expectedOutcome: string;
  actualOutcome: string;
  status: VerificationStatus;
  severity?: VerificationSeverity;
  evidence?: string;
}
