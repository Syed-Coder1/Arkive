import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Trash2, 
  FileText, 
  Shield, 
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  File,
  Image,
  FileImage,
  Link,
  ExternalLink,
  Users
} from 'lucide-react';
import { useDocuments, useClients } from '../hooks/useDatabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { encryption } from '../services/encryption';
import { Document } from '../types';

interface VaultProps {
  showUpload?: boolean;
  onCloseUpload?: () => void;
}

export function Vault({ showUpload: externalShowUpload, onCloseUpload }: VaultProps) {
  const { documents, createDocument, deleteDocument, logAccess, loading } = useDocuments();
  const { clients } = useClients();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showUpload, setShowUpload] = useState(externalShowUpload || false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showLinkedDocs, setShowLinkedDocs] = useState<string | null>(null);

  const [uploadForm, setUploadForm] = useState({
    clientCnic: '',
    fileType: 'other' as Document['fileType'],
    tags: '',
    reference: '',
    files: [] as File[]
  });

  React.useEffect(() => {
    if (externalShowUpload !== undefined) {
      setShowUpload(externalShowUpload);
    }
  }, [externalShowUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadForm(prev => ({ ...prev, files }));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadForm.files.length === 0) {
      alert('Please select at least one file');
      return;
    }

    if (!/^\d{13}$/.test(uploadForm.clientCnic)) {
      alert('CNIC must be exactly 13 digits');
      return;
    }

    setUploading(true);
    
    try {
      for (const file of uploadForm.files) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        // Convert file to base64
        const base64Data = await encryption.fileToBase64(file);
        
        // Encrypt the file data
        const encryptedData = encryption.encrypt(base64Data);

        // Create document record
        await createDocument({
          clientCnic: uploadForm.clientCnic,
          fileName: file.name,
          fileType: uploadForm.fileType,
          fileSize: file.size,
          mimeType: file.type,
          encryptedData,
          tags: uploadForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          reference: uploadForm.reference.trim() || undefined,
          uploadedBy: user!.id
        });
      }

      // Reset form
      setUploadForm({
        clientCnic: '',
        fileType: 'other',
        tags: '',
        reference: '',
        files: []
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setShowUpload(false);
      if (onCloseUpload) {
        onCloseUpload();
      }

      alert(`${uploadForm.files.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      // Log access
      await logAccess(document.id, user!.id, 'download');
      
      // Decrypt and download
      const decryptedData = encryption.decrypt(document.encryptedData);
      const blob = encryption.base64ToBlob(decryptedData, document.mimeType);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading file');
    }
  };

  const handlePreview = async (document: Document) => {
    try {
      // Log access
      await logAccess(document.id, user!.id, 'view');
      
      setSelectedDocument(document);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      alert('Error previewing file');
    }
  };

  const handleDelete = async (documentId: string, fileName: string) => {
    if (confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      try {
        await deleteDocument(documentId);
        alert('Document deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting document');
      }
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="w-5 h-5" />;
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const getFileTypeColor = (fileType: Document['fileType']) => {
    const colors = {
      cnic: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      tax_file: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      contract: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      invoice: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      other: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
    };
    return colors[fileType];
  };

  const getLinkedDocuments = (clientCnic: string) => {
    return documents.filter(doc => doc.clientCnic === clientCnic);
  };

  const filteredDocuments = documents.filter(doc => {
    const client = clients.find(c => c.cnic === doc.clientCnic);
    const matchesSearch = !searchTerm || 
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.clientCnic.includes(searchTerm) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.reference && doc.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = !filterType || doc.fileType === filterType;
    const matchesClient = !filterClient || doc.clientCnic === filterClient;

    return matchesSearch && matchesType && matchesClient;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Secure Vault
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Encrypted document storage with client linking and reference tracking
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105"
        >
          <Upload size={20} />
          Upload Documents
        </button>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{documents.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Size</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(documents.reduce((sum, doc) => sum + doc.fileSize, 0) / (1024 * 1024)).toFixed(1)}MB
              </p>
            </div>
            <Shield className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Linked Clients</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(documents.map(doc => doc.clientCnic)).size}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">With References</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {documents.filter(doc => doc.reference).length}
              </p>
            </div>
            <Link className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Recent Uploads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {documents.filter(doc => 
                  (new Date().getTime() - doc.uploadedAt.getTime()) < 7 * 24 * 60 * 60 * 1000
                ).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by filename, client, CNIC, tags, or reference..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">File Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
            >
              <option value="">All Types</option>
              <option value="cnic">CNIC</option>
              <option value="tax_file">Tax File</option>
              <option value="contract">Contract</option>
              <option value="invoice">Invoice</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client</label>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.cnic}>
                  {client.name} ({client.cnic})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocuments.map((document, index) => {
          const client = clients.find(c => c.cnic === document.clientCnic);
          const linkedDocs = getLinkedDocuments(document.clientCnic);
          return (
            <div
              key={document.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift transition-all duration-300 stagger-item"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getFileIcon(document.mimeType)}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {document.fileName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {client?.name || 'Unknown Client'}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFileTypeColor(document.fileType)}`}>
                  {document.fileType.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Size:</span>
                  <span className="text-gray-900 dark:text-white">
                    {(document.fileSize / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Uploaded:</span>
                  <span className="text-gray-900 dark:text-white">
                    {format(document.uploadedAt, 'MMM dd, yyyy')}
                  </span>
                </div>
                {document.lastAccessed && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Last Accessed:</span>
                    <span className="text-gray-900 dark:text-white">
                      {format(document.lastAccessed, 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
                {document.reference && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Reference:</span>
                    <span className="text-gray-900 dark:text-white truncate">
                      {document.reference}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Linked Docs:</span>
                  <button
                    onClick={() => setShowLinkedDocs(document.clientCnic)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    {linkedDocs.length} <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {document.tags.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {document.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => handlePreview(document)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105"
                >
                  <Eye size={16} />
                  View
                </button>
                <button
                  onClick={() => handleDownload(document)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 hover:scale-105"
                >
                  <Download size={16} />
                  Download
                </button>
                <button
                  onClick={() => handleDelete(document.id, document.fileName)}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 hover:scale-105"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {documents.length === 0 
              ? "Upload your first document to get started" 
              : "Try adjusting your search or filter criteria"
            }
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300"
          >
            <Upload size={20} />
            Upload Documents
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 animate-slideInRight">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Documents
            </h2>
            
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client CNIC *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.clientCnic}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                      setUploadForm({ ...uploadForm, clientCnic: value });
                    }}
                    placeholder="Enter 13-digit CNIC"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                    maxLength={13}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Auto-links to existing client or creates new entry
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Document Type *
                  </label>
                  <select
                    value={uploadForm.fileType}
                    onChange={(e) => setUploadForm({ ...uploadForm, fileType: e.target.value as Document['fileType'] })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                    required
                  >
                    <option value="cnic">CNIC</option>
                    <option value="tax_file">Tax File</option>
                    <option value="contract">Contract</option>
                    <option value="invoice">Invoice</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadForm.reference}
                    onChange={(e) => setUploadForm({ ...uploadForm, reference: e.target.value })}
                    placeholder="Enter reference number or identifier"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    e.g., case number, file reference, invoice number
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                    placeholder="Enter tags separated by commas"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    e.g., urgent, 2024, tax-return
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Files *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum 10MB per file. Supported: PDF, Images, Documents
                  </p>
                </div>

                {uploadForm.files.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Selected Files ({uploadForm.files.length}):
                    </p>
                    <div className="space-y-1">
                      {uploadForm.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 truncate">
                            {file.name}
                          </span>
                          <span className="text-gray-500 dark:text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowUpload(false);
                  if (onCloseUpload) {
                    onCloseUpload();
                  }
                  setUploadForm({
                    clientCnic: '',
                    fileType: 'other',
                    tags: '',
                    reference: '',
                    files: []
                  });
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || uploadForm.files.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : `Upload ${uploadForm.files.length} File(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Linked Documents Modal */}
      {showLinkedDocs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Link className="w-5 h-5" />
                Linked Documents
              </h2>
              <button
                onClick={() => setShowLinkedDocs(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            {(() => {
              const client = clients.find(c => c.cnic === showLinkedDocs);
              const linkedDocs = getLinkedDocuments(showLinkedDocs);
              
              return (
                <div>
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {client?.name || 'Unknown Client'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      CNIC: {showLinkedDocs} • {linkedDocs.length} documents
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {linkedDocs.map((doc) => (
                      <div key={doc.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          {getFileIcon(doc.mimeType)}
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {doc.fileName}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {format(doc.uploadedAt, 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(doc.fileType)}`}>
                            {doc.fileType.replace('_', ' ').toUpperCase()}
                          </span>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handlePreview(doc)}
                              className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Preview Modal - Enhanced */}
      {showPreview && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slideInRight">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {selectedDocument.fileName}
              </h2>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedDocument(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center">
                  {selectedDocument.mimeType.startsWith('image/') ? (
                    <div>
                      <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">Image Preview</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Download to view full image
                      </p>
                    </div>
                  ) : (
                    <div>
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">Document Preview</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Download to view full document
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Document Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedDocument.fileType.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Size:</span>
                      <span className="text-gray-900 dark:text-white">
                        {(selectedDocument.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Client:</span>
                      <span className="text-gray-900 dark:text-white">
                        {clients.find(c => c.cnic === selectedDocument.clientCnic)?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">CNIC:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedDocument.clientCnic}
                      </span>
                    </div>
                    {selectedDocument.reference && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Reference:</span>
                        <span className="text-gray-900 dark:text-white">
                          {selectedDocument.reference}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Uploaded:</span>
                      <span className="text-gray-900 dark:text-white">
                        {format(selectedDocument.uploadedAt, 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedDocument.tags.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Access Log</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedDocument.accessLog.slice(-5).reverse().map((log, index) => (
                      <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="capitalize">{log.action}</span> - {format(log.timestamp, 'MMM dd, HH:mm')}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(selectedDocument)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    onClick={() => setShowLinkedDocs(selectedDocument.clientCnic)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300"
                  >
                    <Link size={16} />
                    Linked
                  </button>
                  <button
                    onClick={() => handleDelete(selectedDocument.id, selectedDocument.fileName)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}