import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Plus, Video, Mail, MessageSquare, Clock, User, FileText, 
  Paperclip, Settings, RefreshCw, Check, X, Bell, ChevronLeft, ChevronRight,
  Link as LinkIcon, Send, Trash2, Edit, ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';
import api from '../../lib/api';

const AgendaPage = () => {
  // State
  const [appointments, setAppointments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    contact_id: '',
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    duration_minutes: 60,
    invoice_id: '',
    document_id: '',
    reminders: []
  });
  
  // Reminder settings
  const [reminderSettings, setReminderSettings] = useState([
    { name: 'J-3', delay_minutes: 4320, email: true, sms: false },
    { name: 'J-1', delay_minutes: 1440, email: true, sms: true },
    { name: 'H-2', delay_minutes: 120, email: false, sms: true },
    { name: 'H-0', delay_minutes: 0, email: false, sms: true }
  ]);
  
  // Calendar view state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, list

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [aptsRes, contactsRes, invoicesRes, docsRes, authRes, settingsRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/contacts'),
        api.get('/invoices'),
        api.get('/documents'),
        api.get('/appointments/auth/status'),
        api.get('/appointments/settings/reminders').catch(() => ({ data: { reminders: reminderSettings } }))
      ]);
      
      setAppointments(aptsRes.data || []);
      setContacts(contactsRes.data || []);
      setInvoices(invoicesRes.data || []);
      setDocuments(docsRes.data || []);
      setGoogleConnected(authRes.data?.connected || false);
      setGoogleEmail(authRes.data?.email || '');
      
      if (settingsRes.data?.reminders) {
        setReminderSettings(settingsRes.data.reminders);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    
    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'connected') {
      toast.success('Google Calendar connecté !');
      window.history.replaceState({}, '', '/admin/agenda');
    } else if (params.get('error')) {
      toast.error(`Erreur: ${params.get('error')}`);
      window.history.replaceState({}, '', '/admin/agenda');
    }
  }, [loadData]);

  // Google Auth
  const connectGoogle = async () => {
    try {
      const response = await api.get('/appointments/auth/login');
      if (response.data?.authorization_url) {
        window.location.href = response.data.authorization_url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur connexion Google');
    }
  };

  const disconnectGoogle = async () => {
    try {
      await api.post('/appointments/auth/disconnect');
      setGoogleConnected(false);
      setGoogleEmail('');
      toast.success('Google Calendar déconnecté');
    } catch (error) {
      toast.error('Erreur déconnexion');
    }
  };

  // Create appointment
  const handleCreateAppointment = async () => {
    if (!formData.contact_id || !formData.title || !formData.start_date || !formData.start_time) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    
    try {
      const start_datetime = `${formData.start_date}T${formData.start_time}:00`;
      
      const payload = {
        contact_id: formData.contact_id,
        title: formData.title,
        description: formData.description,
        start_datetime,
        duration_minutes: parseInt(formData.duration_minutes),
        invoice_id: formData.invoice_id || null,
        document_id: formData.document_id || null,
        reminders: reminderSettings.filter(r => r.email || r.sms).map(r => ({
          delay_minutes: r.delay_minutes,
          email: r.email,
          sms: r.sms
        }))
      };
      
      const response = await api.post('/appointments', payload);
      
      toast.success('RDV créé avec succès !');
      if (response.data?.google_meet_link) {
        toast.success(`Lien Meet: ${response.data.google_meet_link}`);
      }
      
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur création RDV');
    }
  };

  const resetForm = () => {
    setFormData({
      contact_id: '',
      title: '',
      description: '',
      start_date: '',
      start_time: '',
      duration_minutes: 60,
      invoice_id: '',
      document_id: '',
      reminders: []
    });
  };

  // Send invitation email
  const sendInvitation = async (appointmentId) => {
    try {
      await api.post(`/appointments/${appointmentId}/send-invitation`);
      toast.success('Invitation envoyée !');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur envoi invitation');
    }
  };

  // Send SMS reminder
  const sendSmsReminder = async (appointmentId) => {
    try {
      await api.post(`/appointments/${appointmentId}/send-sms-reminder`);
      toast.success('SMS envoyé !');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur envoi SMS');
    }
  };

  // Delete appointment
  const deleteAppointment = async (appointmentId) => {
    if (!window.confirm('Supprimer ce RDV ?')) return;
    
    try {
      await api.delete(`/appointments/${appointmentId}`);
      toast.success('RDV supprimé');
      setShowDetailModal(false);
      loadData();
    } catch (error) {
      toast.error('Erreur suppression');
    }
  };

  // Save reminder settings
  const saveReminderSettings = async () => {
    try {
      await api.put('/appointments/settings/reminders', { reminders: reminderSettings });
      toast.success('Paramètres de relance enregistrés');
      setShowSettingsModal(false);
    } catch (error) {
      toast.error('Erreur sauvegarde');
    }
  };

  // Calendar navigation
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get appointments for a specific day
  const getAppointmentsForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.start_datetime?.startsWith(dateStr));
  };

  // Render calendar grid
  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() || 7; // Monday = 1
    
    const days = [];
    const today = new Date().toISOString().split('T')[0];
    
    // Empty cells before first day
    for (let i = 1; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-white/5 border border-white/10"></div>);
    }
    
    // Days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayAppointments = getAppointmentsForDay(date);
      const isToday = dateStr === today;
      
      days.push(
        <div 
          key={day} 
          className={`h-24 p-1 border border-white/10 overflow-hidden ${isToday ? 'bg-indigo-500/20' : 'bg-white/5'} hover:bg-white/10 transition-colors`}
        >
          <div className={`text-xs font-medium mb-1 ${isToday ? 'text-indigo-400' : 'text-white/70'}`}>
            {day}
          </div>
          <div className="space-y-0.5">
            {dayAppointments.slice(0, 2).map(apt => (
              <div 
                key={apt.id}
                onClick={() => { setSelectedAppointment(apt); setShowDetailModal(true); }}
                className="text-[10px] px-1 py-0.5 bg-indigo-500/30 rounded truncate cursor-pointer hover:bg-indigo-500/50"
              >
                {new Date(apt.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} {apt.title}
              </div>
            ))}
            {dayAppointments.length > 2 && (
              <div className="text-[10px] text-white/50">+{dayAppointments.length - 2} autres</div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  // Format delay for display
  const formatDelay = (minutes) => {
    if (minutes >= 1440) return `J-${Math.floor(minutes / 1440)}`;
    if (minutes >= 60) return `H-${Math.floor(minutes / 60)}`;
    if (minutes === 0) return 'H-0';
    return `${minutes}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="agenda-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-indigo-400" />
            Agenda / RDV
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Gérez vos rendez-vous avec Google Calendar et Meet
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Google Calendar Status */}
          {googleConnected ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg border border-green-500/30">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">{googleEmail || 'Google connecté'}</span>
              <button onClick={disconnectGoogle} className="text-white/50 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button onClick={connectGoogle} variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Video className="w-4 h-4 mr-2" />
              Connecter Google Calendar
            </Button>
          )}
          
          <Button onClick={() => setShowSettingsModal(true)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-500">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau RDV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-2xl font-bold text-white">{appointments.length}</div>
          <div className="text-white/60 text-sm">Total RDV</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-2xl font-bold text-indigo-400">
            {appointments.filter(a => new Date(a.start_datetime) > new Date()).length}
          </div>
          <div className="text-white/60 text-sm">À venir</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-2xl font-bold text-green-400">
            {appointments.filter(a => a.google_meet_link).length}
          </div>
          <div className="text-white/60 text-sm">Avec Meet</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-2xl font-bold text-purple-400">
            {appointments.filter(a => a.email_sent).length}
          </div>
          <div className="text-white/60 text-sm">Invitations envoyées</div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-2">
          <Button onClick={goToPrevMonth} variant="ghost" size="sm" className="text-white">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button onClick={goToToday} variant="ghost" size="sm" className="text-white">
            Aujourd'hui
          </Button>
          <Button onClick={goToNextMonth} variant="ghost" size="sm" className="text-white">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <h2 className="text-lg font-semibold text-white">
          {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h2>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setViewMode('month')} 
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            size="sm"
            className={viewMode === 'month' ? 'bg-indigo-500' : 'text-white'}
          >
            Mois
          </Button>
          <Button 
            onClick={() => setViewMode('list')} 
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className={viewMode === 'list' ? 'bg-indigo-500' : 'text-white'}
          >
            Liste
          </Button>
        </div>
      </div>

      {/* Calendar Grid or List */}
      {viewMode === 'month' ? (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-white/10">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-white/70">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {renderCalendarGrid()}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments
            .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
            .map(apt => (
              <div 
                key={apt.id}
                onClick={() => { setSelectedAppointment(apt); setShowDetailModal(true); }}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{apt.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(apt.start_datetime).toLocaleDateString('fr-FR')} à {new Date(apt.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {apt.contact?.first_name} {apt.contact?.last_name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {apt.google_meet_link && (
                      <a href={apt.google_meet_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        <Video className="w-5 h-5 text-green-400" />
                      </a>
                    )}
                    {apt.email_sent && <Mail className="w-5 h-5 text-indigo-400" />}
                    {apt.invoice && <FileText className="w-5 h-5 text-purple-400" />}
                  </div>
                </div>
              </div>
            ))}
          
          {appointments.length === 0 && (
            <div className="text-center py-12 text-white/50">
              Aucun rendez-vous. Créez-en un !
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Nouveau Rendez-vous
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Contact */}
            <div>
              <Label className="text-white/80">Contact *</Label>
              <Select value={formData.contact_id} onValueChange={(v) => setFormData({...formData, contact_id: v})}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Sélectionner un contact" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/20">
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-white hover:bg-white/10">
                      {c.first_name} {c.last_name} {c.email && `(${c.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Title */}
            <div>
              <Label className="text-white/80">Titre du RDV *</Label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Présentation devis"
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/80">Date *</Label>
                <Input 
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-white/80">Heure *</Label>
                <Input 
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>
            
            {/* Duration */}
            <div>
              <Label className="text-white/80">Durée</Label>
              <Select value={String(formData.duration_minutes)} onValueChange={(v) => setFormData({...formData, duration_minutes: parseInt(v)})}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/20">
                  <SelectItem value="15" className="text-white hover:bg-white/10">15 minutes</SelectItem>
                  <SelectItem value="30" className="text-white hover:bg-white/10">30 minutes</SelectItem>
                  <SelectItem value="45" className="text-white hover:bg-white/10">45 minutes</SelectItem>
                  <SelectItem value="60" className="text-white hover:bg-white/10">1 heure</SelectItem>
                  <SelectItem value="90" className="text-white hover:bg-white/10">1h30</SelectItem>
                  <SelectItem value="120" className="text-white hover:bg-white/10">2 heures</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Description */}
            <div>
              <Label className="text-white/80">Description</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Détails du rendez-vous..."
                className="bg-white/5 border-white/20 text-white"
                rows={3}
              />
            </div>
            
            {/* Link Invoice/Quote */}
            <div>
              <Label className="text-white/80 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Associer un devis/facture
              </Label>
              <Select value={formData.invoice_id || "none"} onValueChange={(v) => setFormData({...formData, invoice_id: v === "none" ? "" : v})}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/20">
                  <SelectItem value="none" className="text-white hover:bg-white/10">Aucun</SelectItem>
                  {invoices.map(inv => (
                    <SelectItem key={inv.id} value={inv.id} className="text-white hover:bg-white/10">
                      {inv.invoice_number || inv.quote_number} - {inv.contact_name || 'Sans nom'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Link Document */}
            <div>
              <Label className="text-white/80 flex items-center gap-1">
                <Paperclip className="w-4 h-4" />
                Joindre un document
              </Label>
              <Select value={formData.document_id || "none"} onValueChange={(v) => setFormData({...formData, document_id: v === "none" ? "" : v})}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/20">
                  <SelectItem value="none" className="text-white hover:bg-white/10">Aucun</SelectItem>
                  {documents.map(doc => (
                    <SelectItem key={doc.id} value={doc.id} className="text-white hover:bg-white/10">
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Reminders info */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-sm font-medium text-white/80 mb-2 flex items-center gap-1">
                <Bell className="w-4 h-4" />
                Relances automatiques configurées
              </div>
              <div className="flex flex-wrap gap-2">
                {reminderSettings.filter(r => r.email || r.sms).map((r, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-indigo-500/20 rounded text-indigo-300">
                    {r.name} {r.email && '📧'} {r.sms && '📱'}
                  </span>
                ))}
              </div>
              <button 
                onClick={() => { setShowCreateModal(false); setShowSettingsModal(true); }}
                className="text-xs text-indigo-400 hover:underline mt-2"
              >
                Modifier les relances →
              </button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)} className="text-white">
              Annuler
            </Button>
            <Button onClick={handleCreateAppointment} className="bg-gradient-to-r from-indigo-500 to-purple-500">
              <Plus className="w-4 h-4 mr-2" />
              Créer le RDV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              {selectedAppointment?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              {/* Date & Time */}
              <div className="flex items-center gap-3 text-white/80">
                <Clock className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="font-medium">
                    {new Date(selectedAppointment.start_datetime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-sm text-white/60">
                    {new Date(selectedAppointment.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {selectedAppointment.duration_minutes} min
                  </div>
                </div>
              </div>
              
              {/* Contact */}
              {selectedAppointment.contact && (
                <div className="flex items-center gap-3 text-white/80">
                  <User className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="font-medium">{selectedAppointment.contact.first_name} {selectedAppointment.contact.last_name}</div>
                    <div className="text-sm text-white/60">{selectedAppointment.contact.email}</div>
                  </div>
                </div>
              )}
              
              {/* Meet Link */}
              {selectedAppointment.google_meet_link && (
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-green-400" />
                  <a 
                    href={selectedAppointment.google_meet_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-400 hover:underline flex items-center gap-1"
                  >
                    Rejoindre Google Meet <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
              
              {/* Description */}
              {selectedAppointment.description && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-sm text-white/60 mb-1">Description</div>
                  <div className="text-white/80">{selectedAppointment.description}</div>
                </div>
              )}
              
              {/* Invoice */}
              {selectedAppointment.invoice && (
                <div className="flex items-center gap-3 text-white/80">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span>Document: {selectedAppointment.invoice.invoice_number || selectedAppointment.invoice.quote_number}</span>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                {!selectedAppointment.email_sent ? (
                  <Button onClick={() => sendInvitation(selectedAppointment.id)} className="bg-indigo-500 hover:bg-indigo-600">
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer l'invitation
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded text-green-400 text-sm">
                    <Check className="w-4 h-4" />
                    Invitation envoyée
                  </div>
                )}
                
                <Button onClick={() => sendSmsReminder(selectedAppointment.id)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Envoyer SMS
                </Button>
                
                <Button onClick={() => deleteAppointment(selectedAppointment.id)} variant="ghost" className="text-red-400 hover:bg-red-500/20">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Modal - Expanded with Email/SMS Templates */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              Paramètres Agenda / RDV
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Section 1: Relances */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400" />
                Relances automatiques
              </h3>
              <p className="text-sm text-white/60">
                Configurez jusqu'à 4 relances avant chaque RDV.
              </p>
              
              {reminderSettings.map((reminder, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <Input 
                      value={reminder.name}
                      onChange={(e) => {
                        const updated = [...reminderSettings];
                        updated[index].name = e.target.value;
                        setReminderSettings(updated);
                      }}
                      className="bg-white/5 border-white/20 text-white w-20"
                    />
                    <Select 
                      value={String(reminder.delay_minutes)} 
                      onValueChange={(v) => {
                        const updated = [...reminderSettings];
                        updated[index].delay_minutes = parseInt(v);
                        setReminderSettings(updated);
                      }}
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-white w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/20">
                        <SelectItem value="0" className="text-white hover:bg-white/10">À l'heure (H-0)</SelectItem>
                        <SelectItem value="30" className="text-white hover:bg-white/10">30 min avant</SelectItem>
                        <SelectItem value="60" className="text-white hover:bg-white/10">1h avant</SelectItem>
                        <SelectItem value="120" className="text-white hover:bg-white/10">2h avant</SelectItem>
                        <SelectItem value="180" className="text-white hover:bg-white/10">3h avant</SelectItem>
                        <SelectItem value="1440" className="text-white hover:bg-white/10">1 jour avant (J-1)</SelectItem>
                        <SelectItem value="2880" className="text-white hover:bg-white/10">2 jours avant (J-2)</SelectItem>
                        <SelectItem value="4320" className="text-white hover:bg-white/10">3 jours avant (J-3)</SelectItem>
                        <SelectItem value="10080" className="text-white hover:bg-white/10">1 semaine avant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={reminder.email}
                        onChange={(e) => {
                          const updated = [...reminderSettings];
                          updated[index].email = e.target.checked;
                          setReminderSettings(updated);
                        }}
                        className="rounded bg-white/10 border-white/20"
                      />
                      <Mail className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm text-white/80">Email</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={reminder.sms}
                        onChange={(e) => {
                          const updated = [...reminderSettings];
                          updated[index].sms = e.target.checked;
                          setReminderSettings(updated);
                        }}
                        className="rounded bg-white/10 border-white/20"
                      />
                      <MessageSquare className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-white/80">SMS</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Section 2: Template Email */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                Template Email d'invitation
              </h3>
              <p className="text-sm text-white/60">
                L'email d'invitation est envoyé manuellement au client. Il contient automatiquement :
              </p>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">Titre et description du RDV</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">Date, heure et durée</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">Lien Google Meet (si généré)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">N° de devis/facture associé</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">Lien vers le document joint</span>
                </div>
              </div>
              <p className="text-xs text-white/50">
                Pour personnaliser le template, modifiez le fichier <code className="bg-white/10 px-1 rounded">/backend/routes/appointments.py</code> fonction <code className="bg-white/10 px-1 rounded">send_invitation_email</code>
              </p>
            </div>
            
            {/* Section 3: Template SMS */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-400" />
                Template SMS de rappel
              </h3>
              <p className="text-sm text-white/60">
                Format du SMS envoyé :
              </p>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <code className="text-sm text-green-300">
                  Rappel RDV Alpha Agency: [Titre] le [Date] à [Heure]. Meet: [Lien]
                </code>
              </div>
              <p className="text-xs text-white/50">
                Expéditeur SMS : <strong>AlphaAgency</strong>
              </p>
            </div>
            
            {/* Section 4: Google Meet */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Video className="w-5 h-5 text-green-400" />
                Google Meet
              </h3>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                {googleConnected ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-400">
                      <Check className="w-5 h-5" />
                      <span>Google Calendar connecté : {googleEmail}</span>
                    </div>
                    <p className="text-sm text-white/60">
                      Un lien Google Meet sera automatiquement généré à chaque création de RDV.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <AlertCircle className="w-5 h-5" />
                      <span>Google Calendar non connecté</span>
                    </div>
                    <p className="text-sm text-white/60">
                      Connectez Google Calendar pour générer automatiquement des liens Meet.
                    </p>
                    <Button onClick={connectGoogle} className="mt-2 bg-white/10 hover:bg-white/20">
                      <Video className="w-4 h-4 mr-2" />
                      Connecter Google Calendar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSettingsModal(false)} className="text-white">
              Annuler
            </Button>
            <Button onClick={saveReminderSettings} className="bg-gradient-to-r from-indigo-500 to-purple-500">
              <Check className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
                      <SelectItem value="10080" className="text-white hover:bg-white/10">1 semaine avant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={reminder.email}
                      onChange={(e) => {
                        const updated = [...reminderSettings];
                        updated[index].email = e.target.checked;
                        setReminderSettings(updated);
                      }}
                      className="rounded bg-white/10 border-white/20"
                    />
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm text-white/80">Email</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={reminder.sms}
                      onChange={(e) => {
                        const updated = [...reminderSettings];
                        updated[index].sms = e.target.checked;
                        setReminderSettings(updated);
                      }}
                      className="rounded bg-white/10 border-white/20"
                    />
                    <MessageSquare className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-white/80">SMS</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSettingsModal(false)} className="text-white">
              Annuler
            </Button>
            <Button onClick={saveReminderSettings} className="bg-gradient-to-r from-indigo-500 to-purple-500">
              <Check className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgendaPage;
