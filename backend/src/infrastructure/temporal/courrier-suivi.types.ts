export interface CourrierSuiviActivities {
  isCourrierPending(courrierId: number): Promise<boolean>;
  sendRelance(courrierId: number, objet: string): Promise<void>;
  sendEscalade(courrierId: number, objet: string): Promise<void>;
}
