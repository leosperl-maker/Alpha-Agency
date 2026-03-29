import { useState, useEffect } from "react";
import { adminUsersAPI, authPasswordAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Shield,
  ShieldCheck,
  Mail,
  Key,
  Loader2,
  UserCog,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Form states
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "admin",
  });
  const [editUser, setEditUser] = useState({
    full_name: "",
    email: "",
    role: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminUsersAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Add user
  const handleAddUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminUsersAPI.create(newUser);
      toast({
        title: "Succès",
        description: "Utilisateur créé avec succès",
      });
      setShowAddDialog(false);
      setNewUser({ full_name: "", email: "", password: "", role: "admin" });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Erreur lors de la création",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Edit user
  const handleEditUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminUsersAPI.update(selectedUser.id, editUser);
      toast({
        title: "Succès",
        description: "Utilisateur mis à jour",
      });
      setShowEditDialog(false);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    setSubmitting(true);
    try {
      await adminUsersAPI.delete(selectedUser.id);
      toast({
        title: "Succès",
        description: "Utilisateur supprimé",
      });
      setShowDeleteDialog(false);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Erreur lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      await authPasswordAPI.changePassword(
        passwordForm.current_password,
        passwordForm.new_password
      );
      toast({
        title: "Succès",
        description: "Mot de passe modifié avec succès",
      });
      setShowPasswordDialog(false);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Erreur lors du changement de mot de passe",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (user) => {
    setSelectedUser(user);
    setEditUser({
      full_name: user.full_name || "",
      email: user.email || "",
      role: user.role || "admin",
    });
    setShowEditDialog(true);
  };

  // Open delete dialog
  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  // Get role badge
  const getRoleBadge = (role) => {
    if (role === "super_admin") {
      return (
        <Badge className="bg-indigo-600 text-white">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Super Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-[#E5E5E5] text-slate-500">
        <Shield className="w-3 h-3 mr-1" />
        Admin
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-7 h-7 text-indigo-600" />
            Gestion des utilisateurs
          </h1>
          <p className="text-slate-500 mt-1">
            Gérez les accès administrateurs de votre plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowPasswordDialog(true)}
            variant="outline"
            className="border-[#CE0202] text-indigo-600 hover:bg-indigo-600/10"
          >
            <Key className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Mon mot de passe</span>
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-indigo-600 hover:bg-indigo-600/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nouvel admin</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="bg-white backdrop-blur-xl border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                <p className="text-sm text-slate-500">Total utilisateurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white backdrop-blur-xl border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {users.filter((u) => u.role === "super_admin").length}
                </p>
                <p className="text-sm text-slate-500">Super admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white backdrop-blur-xl border border-slate-200 col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {users.filter((u) => u.role === "admin").length}
                </p>
                <p className="text-sm text-slate-500">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="bg-white backdrop-blur-xl border border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-slate-900">Liste des utilisateurs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
              Aucun utilisateur trouvé
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead className="text-slate-500">Nom</TableHead>
                    <TableHead className="text-slate-500">Email</TableHead>
                    <TableHead className="text-slate-500">Rôle</TableHead>
                    <TableHead className="text-slate-500 hidden sm:table-cell">Créé le</TableHead>
                    <TableHead className="text-slate-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-slate-200 hover:bg-slate-50/50"
                    >
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-600/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-600 font-bold text-sm">
                              {user.full_name?.charAt(0) || "?"}
                            </span>
                          </div>
                          <span className="truncate max-w-[120px] sm:max-w-none">
                            {user.full_name || "Sans nom"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        <span className="truncate max-w-[120px] sm:max-w-none block">
                          {user.email}
                        </span>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-slate-500 hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(user.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            className="text-slate-500 hover:text-slate-900"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {user.role !== "super_admin" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(user)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white backdrop-blur-xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Ajouter un administrateur
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Créez un nouveau compte administrateur pour accéder au dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-900">Nom complet *</Label>
              <Input
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder="Jean Dupont"
                required
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-900">Email *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="jean@example.com"
                required
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-900">Mot de passe *</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Minimum 8 caractères"
                required
                minLength={8}
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-900">Rôle</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white backdrop-blur-xl">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="border-slate-200"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-600/90"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white backdrop-blur-xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-600" />
              Modifier l'utilisateur
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-900">Nom complet</Label>
              <Input
                value={editUser.full_name}
                onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                placeholder="Jean Dupont"
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-900">Email</Label>
              <Input
                type="email"
                value={editUser.email}
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                placeholder="jean@example.com"
                className="bg-white border-slate-200"
              />
            </div>
            {selectedUser?.role !== "super_admin" && (
              <div className="space-y-2">
                <Label className="text-slate-900">Rôle</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => setEditUser({ ...editUser, role: value })}
                >
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white backdrop-blur-xl">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="border-slate-200"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-600/90"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">
              Supprimer cet utilisateur ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Cette action est irréversible. L'utilisateur{" "}
              <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email}) ne pourra
              plus accéder au dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-white backdrop-blur-xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              Changer mon mot de passe
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Entrez votre mot de passe actuel et le nouveau mot de passe.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-900">Mot de passe actuel *</Label>
              <Input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current_password: e.target.value })
                }
                required
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-900">Nouveau mot de passe *</Label>
              <Input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, new_password: e.target.value })
                }
                required
                minLength={8}
                placeholder="Minimum 8 caractères"
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-900">Confirmer le nouveau mot de passe *</Label>
              <Input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                }
                required
                minLength={8}
                className="bg-white border-slate-200"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasswordDialog(false)}
                className="border-slate-200"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-600/90"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Modifier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
