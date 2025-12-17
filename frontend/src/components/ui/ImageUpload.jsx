import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from './button';
import { toast } from 'sonner';
import api from '../../lib/api';

const ImageUpload = ({ 
  value, 
  onChange, 
  label = "Image",
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB
  className = ""
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      toast.error(`Fichier trop volumineux. Maximum: ${maxSize / 1024 / 1024}MB`);
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    // Upload to server
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const imageUrl = response.data.url;
      setPreview(imageUrl);
      onChange(imageUrl);
      toast.success('Image téléversée avec succès');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du téléversement');
      setPreview(value); // Restore previous value
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-[#1A1A1A]">{label}</label>
      )}
      
      <div className="relative">
        {preview ? (
          <div className="relative rounded-lg overflow-hidden border border-[#E5E5E5] bg-[#F8F8F8]">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white/90 hover:bg-white"
              >
                <Upload className="w-4 h-4 mr-1" />
                Changer
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
              >
                <X className="w-4 h-4 mr-1" />
                Supprimer
              </Button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#CE0202]" />
              </div>
            )}
          </div>
        ) : (
          <div 
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#E5E5E5] rounded-lg p-8 text-center cursor-pointer hover:border-[#CE0202] hover:bg-[#CE0202]/5 transition-colors"
          >
            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#CE0202] mb-2" />
                <p className="text-sm text-[#666666]">Téléversement en cours...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#CE0202]/10 rounded-full flex items-center justify-center mb-3">
                  <ImageIcon className="w-6 h-6 text-[#CE0202]" />
                </div>
                <p className="text-sm font-medium text-[#1A1A1A] mb-1">
                  Cliquez pour téléverser
                </p>
                <p className="text-xs text-[#666666]">
                  PNG, JPG, GIF, WEBP (max. {maxSize / 1024 / 1024}MB)
                </p>
              </div>
            )}
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ImageUpload;
