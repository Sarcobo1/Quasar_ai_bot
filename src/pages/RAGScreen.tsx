import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, File, ToggleLeft, ToggleRight, Trash2, Loader2, Database } from "lucide-react";
import StarField from "@/components/StarField";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";

interface RagFile {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  active: boolean;
  uploadedAt: number;
}

const RAGScreen = () => {
  const [files, setFiles] = useState<RagFile[]>([]);
  const [totalFormatted, setTotalFormatted] = useState("0 KB");
  const [activeCount, setActiveCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/rag/files");
      const data = await res.json();
      setFiles(data.files);
      setTotalFormatted(data.totalFormatted);
      setActiveCount(data.activeCount);
    } catch (e) { console.error("Failed to fetch RAG files"); }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const formData = new FormData();
        formData.append("file", selectedFiles[i]);
        await fetch("/api/rag/upload", { method: "POST", body: formData });
      }
      await fetchFiles();
    } catch (err) { console.error("Upload failed"); }
    finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      await fetch(`/api/rag/toggle/${encodeURIComponent(id)}`, { method: "POST" });
      await fetchFiles();
    } finally { setToggling(null); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/rag/${encodeURIComponent(id)}`, { method: "DELETE" });
      await fetchFiles();
    } finally { setDeleting(null); }
  };

  return (
    <MobileFrame>
      <StarField />
      <div className="relative z-10 min-h-screen px-5 pt-14 pb-28">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Knowledge Base</h1>
          <p className="text-xs text-muted-foreground mb-6">Upload documents for RAG-powered responses</p>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card border-dashed border-2 border-primary/20 p-8 mb-6 flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {uploading ? <Loader2 size={20} className="text-primary animate-spin" /> : <Upload size={20} className="text-primary" />}
          </div>
          <p className="text-sm font-medium text-foreground">
            {uploading ? "Uploading..." : "Upload Documents"}
          </p>
          <p className="text-[10px] text-muted-foreground">PDF, TXT, MD · Max 50 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary-gradient text-xs px-5 py-2 disabled:opacity-50"
          >
            Browse Files
          </button>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-3 mb-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Database size={14} className="text-primary" />
            <span className="text-xs font-medium text-foreground">Total KB Size</span>
          </div>
          <span className="text-xs font-semibold text-primary">{totalFormatted}</span>
        </motion.div>

        {/* Documents List */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Documents ({files.length})</h2>
          <span className="text-[10px] text-muted-foreground">{activeCount} active</span>
        </div>

        {files.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {files.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="glass-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    {doc.name.endsWith(".pdf") ? <FileText size={16} className="text-primary" /> : <File size={16} className="text-secondary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-[10px] text-muted-foreground">{doc.sizeFormatted}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(doc.id)} disabled={toggling === doc.id}>
                      {toggling === doc.id ? (
                        <Loader2 size={28} className="text-muted-foreground animate-spin" />
                      ) : doc.active ? (
                        <ToggleRight size={28} className="text-primary" />
                      ) : (
                        <ToggleLeft size={28} className="text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleting === doc.id}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      {deleting === doc.id ? (
                        <Loader2 size={14} className="text-destructive animate-spin" />
                      ) : (
                        <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </MobileFrame>
  );
};

export default RAGScreen;
