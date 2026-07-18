const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
      const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
      throw new Error(msg || `Erreur ${response.status}`);
    }

    return response.json();
  }

  // ─── Auth ───
  async login(email: string, motDePasse: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, motDePasse }),
    });
  }

  async register(data: { email: string; motDePasse: string; nom: string; prenom: string }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refresh(refreshToken: string) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getProfile(token: string) {
    return this.request('/auth/profile', { token });
  }

  async updateProfile(token: string, data: { nom?: string; prenom?: string }) {
    return this.request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    });
  }

  async changePassword(token: string, data: { currentPassword: string; newPassword: string }) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  // ─── Admin: Ministeres ───
  async getMinisteres(token: string, search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/admin/ministeres${params}`, { token });
  }

  async createMinistere(token: string, data: { nom: string; code?: string }) {
    return this.request('/admin/ministeres', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateMinistere(token: string, id: number, data: { nom?: string; code?: string }) {
    return this.request(`/admin/ministeres/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteMinistere(token: string, id: number) {
    return this.request(`/admin/ministeres/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // ─── Admin: Directions ───
  async getDirections(token: string, ministereId?: number) {
    const params = ministereId ? `?ministereId=${ministereId}` : '';
    return this.request(`/admin/directions${params}`, { token });
  }

  async createDirection(token: string, data: { ministereId: number; nom: string; type?: string }) {
    return this.request('/admin/directions', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateDirection(token: string, id: number, data: { nom?: string; type?: string }) {
    return this.request(`/admin/directions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteDirection(token: string, id: number) {
    return this.request(`/admin/directions/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // ─── Admin: Utilisateurs ───
  async getUtilisateurs(token: string, search?: string, directionId?: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (directionId) params.set('directionId', String(directionId));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/admin/utilisateurs${qs}`, { token });
  }

  async createUtilisateur(token: string, data: any) {
    return this.request('/admin/utilisateurs', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateUtilisateur(token: string, id: number, data: any) {
    return this.request(`/admin/utilisateurs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteUtilisateur(token: string, id: number) {
    return this.request(`/admin/utilisateurs/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // ─── Admin: Stats ───
  async getAdminStats(token: string) {
    return this.request('/admin/stats', { token });
  }

  // ─── Pilotage ───
  async getDashboardStats(token: string) {
    return this.request('/stats/dashboard', { token });
  }

  async getAnalyticsStats(token: string, months?: number) {
    const qs = months ? `?months=${months}` : '';
    return this.request(`/stats/analytics${qs}`, { token });
  }

  async getProcessMiningStats(token: string) {
    return this.request('/stats/process-mining', { token });
  }

  // ─── Courriers ───
  async getCourriers(token: string, params?: {
    search?: string;
    statut?: string;
    typeCourrier?: string;
    scope?: string;
    dateDebut?: string;
    dateFin?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.statut) searchParams.set('statut', params.statut);
    if (params?.typeCourrier) searchParams.set('typeCourrier', params.typeCourrier);
    if (params?.scope) searchParams.set('scope', params.scope);
    if (params?.dateDebut) searchParams.set('dateDebut', params.dateDebut);
    if (params?.dateFin) searchParams.set('dateFin', params.dateFin);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request(`/courriers${qs}`, { token });
  }

  async getCourrier(token: string, id: number) {
    return this.request(`/courriers/${id}`, { token });
  }

  async createCourrier(token: string, data: {
    objet: string;
    corps?: string;
    typeCourrier: string;
    destinataireDirectionId: number;
    ministereDestinataireId?: number;
  }) {
    return this.request('/courriers', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateCourrier(token: string, id: number, data: {
    objet?: string;
    corps?: string;
    statut?: string;
  }) {
    return this.request(`/courriers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async envoyerCourrier(token: string, id: number) {
    return this.request(`/courriers/${id}/envoyer`, {
      method: 'POST',
      token,
    });
  }

  async transmettreCourrier(token: string, id: number, data: {
    destinataireDirectionId: number;
    commentaire?: string;
  }) {
    return this.request(`/courriers/${id}/transmettre`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async recevoirCourrier(token: string, id: number) {
    return this.request(`/courriers/${id}/recevoir`, {
      method: 'POST',
      token,
    });
  }

  async deleteCourrier(token: string, id: number) {
    return this.request(`/courriers/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  async archiverCourrier(token: string, id: number, data: { dureeConservation: number; emplacement?: string }) {
    return this.request(`/courriers/${id}/archiver`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async getArchives(token: string, params?: {
    search?: string;
    type?: string;
    retention?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.retention && params.retention !== 'all') searchParams.set('retention', params.retention);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request(`/archives${qs}`, { token });
  }

  async getArchive(token: string, id: number) {
    return this.request(`/archives/${id}`, { token });
  }

  async desarchiverCourrier(token: string, id: number) {
    return this.request(`/archives/${id}/desarchiver`, {
      method: 'POST',
      token,
    });
  }

  // ─── Audit (M4) ───
  async searchAuditCourriers(token: string, params?: {
    search?: string;
    statut?: string;
    typeCourrier?: string;
    periode?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.statut) searchParams.set('statut', params.statut);
    if (params?.typeCourrier) searchParams.set('typeCourrier', params.typeCourrier);
    if (params?.periode) searchParams.set('periode', params.periode);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request(`/audit/search${qs}`, { token });
  }

  async getAuditLogs(token: string, params?: {
    search?: string;
    entiteType?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.entiteType) searchParams.set('entiteType', params.entiteType);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request(`/audit/logs${qs}`, { token });
  }

  async getAuditReports(token: string) {
    return this.request(`/audit/reports`, { token });
  }

  async getAuditReport(token: string, id: number) {
    return this.request(`/audit/reports/${id}`, { token });
  }

  async createAuditReport(token: string, data: {
    titre: string;
    periodeDebut: string;
    periodeFin: string;
  }) {
    return this.request(`/audit/reports`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async getAuditAnomalies(token: string, params?: {
    type?: string;
    statut?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.statut) searchParams.set('statut', params.statut);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request(`/audit/anomalies${qs}`, { token });
  }

  async resolveAuditAnomaly(token: string, key: string, note?: string) {
    return this.request(`/audit/anomalies/resolve`, {
      method: 'POST',
      body: JSON.stringify({ anomalyKey: key, note }),
      token,
    });
  }

  // ─── Notifications ───
  async getNotifications(
    token: string,
    page?: number,
    limit?: number,
    filters?: { type?: string; unreadOnly?: boolean },
  ) {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (filters?.type && filters.type !== 'all') params.set('type', filters.type);
    if (filters?.unreadOnly) params.set('unreadOnly', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/notifications${qs}`, { token });
  }

  async markNotificationRead(token: string, id: number) {
    return this.request(`/notifications/${id}/read`, {
      method: 'POST',
      token,
    });
  }

  async markAllNotificationsRead(token: string) {
    return this.request('/notifications/read-all', {
      method: 'POST',
      token,
    });
  }

  // ─── IA (proxy Nest → service local) ───
  async getAiHealth(token: string) {
    return this.request('/ai/health', { token });
  }

  async getAiSuggestions(token: string) {
    return this.request('/ai/suggestions', { token });
  }

  async analyzePieceJointeAi(token: string, courrierId: number, pjId: number) {
    return this.request(`/ai/analyze/courriers/${courrierId}/pieces-jointes/${pjId}`, {
      method: 'POST',
      token,
    });
  }

  async analyzeAllPiecesJointesAi(token: string, courrierId: number) {
    return this.request(`/ai/analyze/courriers/${courrierId}/pieces-jointes`, {
      method: 'POST',
      token,
    });
  }

  async analyzeTextAi(token: string, data: { texte: string; objet?: string }) {
    return this.request('/ai/analyze/text', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async aiDraft(token: string, data: { objet?: string; resume?: string; destinataire?: string }) {
    return this.request('/ai/draft', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async acceptAiSuggestion(
    token: string,
    data: { actionCode: string; commentaire?: string; courrierId?: number },
  ) {
    return this.request('/ai/suggestions/accept', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  // ─── Messages ───
  async getMessages(token: string, courrierId: number, page?: number, limit?: number) {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/courriers/${courrierId}/messages${qs}`, { token });
  }

  async getMessagePresence(token: string, courrierId: number) {
    return this.request(`/courriers/${courrierId}/messages/presence`, { token });
  }

  async sendMessage(token: string, courrierId: number, contenu: string) {
    return this.request(`/courriers/${courrierId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ contenu }),
      token,
    });
  }

  async uploadMessageAttachment(token: string, courrierId: number, messageId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${this.baseUrl}/api/courriers/${courrierId}/messages/${messageId}/attachments`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
      const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
      throw new Error(msg || `Erreur ${response.status}`);
    }

    return response.json();
  }

  async downloadMessageAttachment(
    token: string,
    courrierId: number,
    messageId: number,
    attachmentId: number,
    filename: string
  ) {
    const response = await fetch(
      `${this.baseUrl}/api/courriers/${courrierId}/messages/${messageId}/attachments/${attachmentId}/download`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
      const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
      throw new Error(msg || `Erreur ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async uploadPieceJointe(token: string, courrierId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/courriers/${courrierId}/pieces-jointes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
      const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
      throw new Error(msg || `Erreur ${response.status}`);
    }

    return response.json();
  }

  async deletePieceJointe(token: string, courrierId: number, pjId: number) {
    return this.request(`/courriers/${courrierId}/pieces-jointes/${pjId}`, {
      method: 'DELETE',
      token,
    });
  }

  async downloadPieceJointe(token: string, courrierId: number, pjId: number) {
    const response = await fetch(`${this.baseUrl}/api/courriers/${courrierId}/pieces-jointes/${pjId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
      const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
      throw new Error(msg || `Erreur ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'document';
    if (contentDisposition) {
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\s]+)/);
      if (utf8Match) {
        filename = decodeURIComponent(utf8Match[1]);
      } else {
        const match = contentDisposition.match(/filename="?([^";\s]+)"?/);
        if (match) filename = decodeURIComponent(match[1]);
      }
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // ── Communications Gouvernement ──
  async listPublications(token: string, params?: { portee?: string; statut?: string }) {
    const q = new URLSearchParams();
    if (params?.portee) q.set('portee', params.portee);
    if (params?.statut) q.set('statut', params.statut);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/gouvernement/publications${qs}`, { token });
  }

  async getPublication(token: string, id: number) {
    return this.request(`/gouvernement/publications/${id}`, { token });
  }

  async createPublication(token: string, body: Record<string, unknown>) {
    return this.request(`/gouvernement/publications`, {
      method: 'POST',
      body: JSON.stringify(body),
      token,
    });
  }

  async publishPublication(token: string, id: number) {
    return this.request(`/gouvernement/publications/${id}/publish`, {
      method: 'POST',
      token,
    });
  }

  async archivePublication(token: string, id: number) {
    return this.request(`/gouvernement/publications/${id}/archive`, {
      method: 'POST',
      token,
    });
  }

  async uploadPublicationPj(token: string, id: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(
      `${this.baseUrl}/api/gouvernement/publications/${id}/pieces-jointes`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData },
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
      const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
      throw new Error(msg || `Erreur ${response.status}`);
    }
    return response.json();
  }

  async uploadPublicationPjBatch(token: string, id: number, files: File[]) {
    if (files.length === 0) return [];
    if (files.length === 1) {
      return [await this.uploadPublicationPj(token, id, files[0])];
    }
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const response = await fetch(
      `${this.baseUrl}/api/gouvernement/publications/${id}/pieces-jointes/batch`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData },
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
      const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
      throw new Error(msg || `Erreur ${response.status}`);
    }
    return response.json();
  }

  async downloadPublicationPj(token: string, id: number, pjId: number, filename: string) {
    const response = await fetch(
      `${this.baseUrl}/api/gouvernement/publications/${id}/pieces-jointes/${pjId}/download`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) throw new Error('Téléchargement impossible');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async accuseReceptionPublication(token: string, id: number, commentaire?: string) {
    return this.request(`/gouvernement/publications/${id}/accuse-reception`, {
      method: 'POST',
      body: JSON.stringify({ commentaire }),
      token,
    });
  }

  async sendPublicationMessage(token: string, id: number, contenu: string) {
    return this.request(`/gouvernement/publications/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ contenu }),
      token,
    });
  }
}

export const api = new ApiClient(API_BASE);
