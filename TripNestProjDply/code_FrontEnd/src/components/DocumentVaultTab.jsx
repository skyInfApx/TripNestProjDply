import { useState, useEffect, useCallback, useMemo } from "react";
import vaultService from "../services/vaultService";
import { formatDisplayDate } from "../utils/dateUtils";

/**
 * DocumentCategory Configuration: Labels, icons, and color themes.
 */
const CATEGORY_META = {
  ALL: { label: "All Files", icon: "📁", badgeBg: "#f1f5f9", badgeColor: "#475569", border: "#cbd5e1" },
  TICKET: { label: "Tickets", icon: "🎟️", badgeBg: "#ede9fe", badgeColor: "#6d28d9", border: "#c4b5fd" },
  BOOKING: { label: "Bookings", icon: "🏨", badgeBg: "#e0f2fe", badgeColor: "#0369a1", border: "#7dd3fc" },
  RECEIPT: { label: "Receipts", icon: "🧾", badgeBg: "#fef3c7", badgeColor: "#b45309", border: "#fde68a" },
  PHOTO: { label: "Photos", icon: "📸", badgeBg: "#fce7f3", badgeColor: "#be185d", border: "#fbcfe8" },
  OTHER: { label: "Other", icon: "📄", badgeBg: "#f1f5f9", badgeColor: "#334155", border: "#cbd5e1" },
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit matching Spring Boot FileStorageService
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

function DocumentVaultTab({ tripId, trip }) {
  // Document State
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState("TICKET");
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Storage Destination State
  const [storageType, setStorageType] = useState("CLOUD");
  const [cloudConfigured, setCloudConfigured] = useState(false);

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);

  // Deleting State
  const [deletingId, setDeletingId] = useState(null);

  /**
   * Fetch all documents for this trip from the backend (manual refresh or after mutation).
   */
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await vaultService.getDocumentsByTrip(tripId);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load trip documents.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    let isMounted = true;
    vaultService.getDocumentsByTrip(tripId)
      .then((data) => {
        if (isMounted) setDocuments(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (isMounted) setError(err.response?.data?.message || err.message || "Failed to load trip documents.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Check Cloud Storage (Cloudinary) setup status
    vaultService.getStorageConfig().then((cfg) => {
      if (isMounted && cfg) {
        setCloudConfigured(!!cfg.cloudinaryConfigured);
        if (!cfg.cloudinaryConfigured) {
          setStorageType("LOCAL");
        } else {
          setStorageType("CLOUD");
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  /**
   * Filter documents by selected category tab.
   */
  const filteredDocuments = useMemo(() => {
    if (selectedCategory === "ALL") return documents;
    return documents.filter((d) => d.category === selectedCategory);
  }, [documents, selectedCategory]);

  /**
   * Top KPI statistics computed dynamically.
   */
  const stats = useMemo(() => {
    const total = documents.length;
    const tickets = documents.filter((d) => d.category === "TICKET").length;
    const bookings = documents.filter((d) => d.category === "BOOKING").length;
    const receipts = documents.filter((d) => d.category === "RECEIPT").length;
    const photos = documents.filter((d) => d.category === "PHOTO").length;
    const others = documents.filter((d) => d.category === "OTHER").length;

    // Total raw bytes
    const totalBytes = documents.reduce((acc, d) => acc + (d.fileSizeBytes || 0), 0);
    const formattedStorage =
      totalBytes > 1024 * 1024
        ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
        : `${(totalBytes / 1024).toFixed(1)} KB`;

    return { total, tickets, bookings, receipts, photos, others, formattedStorage };
  }, [documents]);

  /**
   * Validates a file before storing in upload state.
   */
  const validateAndSetFile = (file) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 10 MB limit.`);
      setSelectedFile(null);
      return;
    }

    const name = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
    if (!hasValidExt) {
      setError("Unsupported file format. Please upload a PDF, PNG, or JPEG file.");
      setSelectedFile(null);
      return;
    }

    setError("");
    setSelectedFile(file);
  };

  /**
   * File input change handler.
   */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  /**
   * Drag-and-drop handlers.
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  /**
   * Submit document upload to backend.
   */
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const savedDoc = await vaultService.uploadDocument(tripId, selectedFile, uploadCategory, storageType);
      const targetLabel = (savedDoc.storageType === "CLOUD" || (savedDoc.storageUrl && savedDoc.storageUrl.startsWith("http")))
        ? "☁️ Cloud Storage (Cloudinary)"
        : "💻 Local Server Disk";
      setSuccess(`🎉 Successfully uploaded "${savedDoc.fileName}" to ${targetLabel}!`);
      setSelectedFile(null);
      // Reset input element if available
      const inputEl = document.getElementById("vault-file-input");
      if (inputEl) inputEl.value = "";
      await fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  /**
   * Delete a document with user confirmation.
   */
  const handleDelete = async (docId, fileName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}" from the vault?`)) {
      return;
    }

    setDeletingId(docId);
    setError("");
    setSuccess("");
    try {
      await vaultService.deleteDocument(docId);
      setSuccess(`🗑️ Deleted "${fileName}" from vault.`);
      await fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "8px 0" }}>
      {/* ========================================================================= */}
      {/* HEADER SECTION                                                           */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <span>📁</span> Trip Document & Media Vault
            </h2>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
              Secure digital safety locker for flight tickets, hotel vouchers, receipts, and vacation memories for {trip?.title || "this trip"}.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDocuments}
            disabled={loading}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#334155",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🔄</span> Refresh Vault
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ALERT BANNERS                                                            */}
      {/* ========================================================================= */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            padding: "12px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            fontSize: "13px",
            fontWeight: "600",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c" }}>✕</button>
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
            padding: "12px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            fontSize: "13px",
            fontWeight: "600",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#15803d" }}>✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP KPI CARDS                                                            */}
      {/* ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "5px solid #3b82f6" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" }}>
            📁 Total Files Stored
          </span>
          <div style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>
            {stats.total} {stats.total <= 1 ? "Document" : "Documents"}
          </div>
          <span style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "600", marginTop: "4px", display: "block" }}>
            {stats.formattedStorage} total storage used
          </span>
        </div>

        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "5px solid #8b5cf6" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" }}>
            🎟️ Tickets & Bookings
          </span>
          <div style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>
            {stats.tickets + stats.bookings} {stats.tickets + stats.bookings <= 1 ? "File" : "Files"}
          </div>
          <span style={{ fontSize: "12px", color: "#6d28d9", fontWeight: "600", marginTop: "4px", display: "block" }}>
            {stats.tickets} tickets • {stats.bookings} hotel vouchers
          </span>
        </div>

        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "5px solid #f59e0b" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" }}>
            🧾 Expense Receipts
          </span>
          <div style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>
            {stats.receipts} {stats.receipts <= 1 ? "Receipt" : "Receipts"}
          </div>
          <span style={{ fontSize: "12px", color: "#b45309", fontWeight: "600", marginTop: "4px", display: "block" }}>
            Attached travel expenditure proofs
          </span>
        </div>

        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "5px solid #ec4899" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" }}>
            📸 Vacation Memories
          </span>
          <div style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>
            {stats.photos} {stats.photos <= 1 ? "Photo" : "Photos"}
          </div>
          <span style={{ fontSize: "12px", color: "#be185d", fontWeight: "600", marginTop: "4px", display: "block" }}>
            Squad snapshots & scenic memories
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* UPLOAD DROPZONE CARD                                                      */}
      {/* ========================================================================= */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: isDragOver ? "2px dashed #059669" : "1px solid #e2e8f0",
          boxShadow: isDragOver ? "0 0 16px rgba(5,150,105,0.15)" : "0 2px 8px rgba(0,0,0,0.03)",
          padding: "24px",
          marginBottom: "32px",
          transition: "all 0.2s ease",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <span style={{ fontSize: "20px" }}>📤</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
              Upload Travel Document or Photo
            </h3>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Drag and drop your file here, or click Browse below. Supports PDF, PNG, and JPG (max 10 MB).
            </span>
          </div>
        </div>

        <form onSubmit={handleUploadSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
              alignItems: "start",
            }}
          >
            {/* File Picker */}
            <div>
              <label htmlFor="vault-file-input" style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                Select File *
              </label>
              <input
                id="vault-file-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  background: "#f8fafc",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label htmlFor="vault-category-select" style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                Category *
              </label>
              <select
                id="vault-category-select"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: "600",
                  boxSizing: "border-box",
                }}
              >
                <option value="TICKET">🎟️ Tickets (Flight, Train, Bus, Pass)</option>
                <option value="BOOKING">🏨 Bookings (Hotel, Airbnb, Rental)</option>
                <option value="RECEIPT">🧾 Receipts (Dining, Taxi, Bill)</option>
                <option value="PHOTO">📸 Photos (Memories & Sightseeing)</option>
                <option value="OTHER">📄 Other (Visa, Insurance, ID)</option>
              </select>
            </div>

            {/* Storage Target Selector (Cloud vs Local) */}
            <div>
              <label htmlFor="vault-storage-select" style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                Storage Destination *
              </label>
              <select
                id="vault-storage-select"
                value={storageType}
                onChange={(e) => setStorageType(e.target.value)}
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: "600",
                  boxSizing: "border-box",
                }}
              >
                <option value="CLOUD">
                  ☁️ Cloud Storage (Cloudinary){cloudConfigured ? " ✅ Ready" : " (Requires .env keys)"}
                </option>
                <option value="LOCAL">
                  💻 Local Server Disk (uploads/documents/)
                </option>
              </select>
            </div>

            {/* Upload Button */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "transparent", marginBottom: "6px", userSelect: "none" }}>
                Action
              </label>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "0 18px",
                  borderRadius: "8px",
                  background: uploading || !selectedFile ? "#94a3b8" : "#059669",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "700",
                  border: "none",
                  cursor: uploading || !selectedFile ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 2px 4px rgba(5,150,105,0.2)",
                  boxSizing: "border-box",
                }}
              >
                {uploading ? (
                  <>
                    <span className="spinner" style={{ width: "14px", height: "14px" }}></span>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Upload to Vault</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Selected File Feedback Banner (Placed below row so inputs never misalign) */}
          {selectedFile && (
            <div
              style={{
                marginTop: "14px",
                padding: "10px 14px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                <span style={{ fontSize: "16px" }}>📎</span>
                <span>
                  Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  const inputEl = document.getElementById("vault-file-input");
                  if (inputEl) inputEl.value = "";
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#b91c1c",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                ✕ Deselect
              </button>
            </div>
          )}

          {!cloudConfigured && storageType === "CLOUD" && (
            <div style={{ marginTop: "12px", padding: "8px 12px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "12px", color: "#92400e", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>💡</span>
              <span>
                Cloudinary is not yet configured with keys in <code>.env</code>. To test cloud storage, add your <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>, and <code>CLOUDINARY_API_SECRET</code> to your backend <code>.env</code> file, or switch to <strong>Local Server Disk</strong>.
              </span>
            </div>
          )}
        </form>
      </div>

      {/* ========================================================================= */}
      {/* FILTER TABS                                                              */}
      {/* ========================================================================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const count = key === "ALL" ? documents.length : documents.filter((d) => d.category === key).length;
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategory(key)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: isSelected ? `2px solid ${meta.badgeColor}` : "1px solid #e2e8f0",
                  background: isSelected ? meta.badgeBg : "#ffffff",
                  color: isSelected ? meta.badgeColor : "#64748b",
                  fontWeight: isSelected ? "800" : "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span
                  style={{
                    background: isSelected ? meta.badgeColor : "#e2e8f0",
                    color: isSelected ? "#ffffff" : "#475569",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    fontSize: "11px",
                    fontWeight: "800",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <span style={{ fontSize: "13px", color: "#64748b" }}>
          Showing <strong>{filteredDocuments.length}</strong> {filteredDocuments.length <= 1 ? "document" : "documents"}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* DOCUMENTS GRID                                                           */}
      {/* ========================================================================= */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
          <p style={{ color: "#065f46", fontWeight: "600" }}>Loading trip vault files...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "2px dashed #cbd5e1",
            padding: "48px 24px",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <span style={{ fontSize: "42px", display: "block", marginBottom: "12px" }}>📂</span>
          <h4 style={{ margin: "0 0 6px", color: "#0f172a", fontSize: "16px", fontWeight: "800" }}>
            No documents found in this category
          </h4>
          <p style={{ margin: 0, fontSize: "13px" }}>
            Upload your flight tickets, booking confirmations, or vacation photos using the upload card above.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredDocuments.map((doc) => {
            const meta = CATEGORY_META[doc.category] || CATEGORY_META.OTHER;
            const fullUrl = vaultService.getFileUrl(doc.storageUrl);
            const isImage = doc.fileType?.startsWith("image/");
            const isPdf = doc.fileType === "application/pdf";

            return (
              <div
                key={doc.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                {/* Visual Preview Header */}
                <div
                  style={{
                    height: "140px",
                    background: isImage ? "#0f172a" : meta.badgeBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {isImage ? (
                    <img
                      src={fullUrl}
                      alt={doc.fileName}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        cursor: "pointer",
                      }}
                      onClick={() => setPreviewDoc(doc)}
                    />
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "48px" }}>{isPdf ? "📑" : meta.icon}</span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: "800",
                          color: meta.badgeColor,
                          marginTop: "4px",
                          textTransform: "uppercase",
                        }}
                      >
                        {isPdf ? "PDF Document" : doc.fileType || "File"}
                      </span>
                    </div>
                  )}

                  {/* Storage Location Badge */}
                  <span
                    style={{
                      position: "absolute",
                      top: "10px",
                      left: "10px",
                      background: doc.storageType === "CLOUD" || (doc.storageUrl && doc.storageUrl.startsWith("http")) ? "#ecfdf5" : "#f1f5f9",
                      color: doc.storageType === "CLOUD" || (doc.storageUrl && doc.storageUrl.startsWith("http")) ? "#065f46" : "#334155",
                      border: `1px solid ${doc.storageType === "CLOUD" || (doc.storageUrl && doc.storageUrl.startsWith("http")) ? "#a7f3d0" : "#cbd5e1"}`,
                      padding: "2px 8px",
                      borderRadius: "8px",
                      fontSize: "10px",
                      fontWeight: "800",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                  >
                    {doc.storageType === "CLOUD" || (doc.storageUrl && doc.storageUrl.startsWith("http")) ? "☁️ Cloud" : "💻 Local"}
                  </span>

                  {/* Category Pill Tag */}
                  <span
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: meta.badgeBg,
                      color: meta.badgeColor,
                      border: `1px solid ${meta.border}`,
                      padding: "2px 8px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: "800",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    }}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </span>
                </div>

                {/* File Metadata Body */}
                <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h4
                    title={doc.fileName}
                    style={{
                      margin: "0 0 6px",
                      fontSize: "14px",
                      fontWeight: "800",
                      color: "#0f172a",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {doc.fileName}
                  </h4>

                  <div style={{ fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", gap: "3px", marginBottom: "14px" }}>
                    <span>📦 Size: <strong>{doc.fileSizeFormatted || `${((doc.fileSizeBytes || 0) / 1024).toFixed(1)} KB`}</strong></span>
                    <span>👤 Uploaded by: <strong>{doc.uploadedByUserName || "Companion"}</strong></span>
                    <span>📅 Date: {formatDisplayDate(doc.uploadedAt?.split("T")?.[0] || doc.uploadedAt)}</span>
                    <span>
                      💾 Storage:{" "}
                      {doc.storageType === "CLOUD" || (doc.storageUrl && doc.storageUrl.startsWith("http")) ? (
                        <strong style={{ color: "#059669" }}>☁️ Cloud (Cloudinary)</strong>
                      ) : (
                        <strong style={{ color: "#475569" }}>💻 Local Server Disk</strong>
                      )}
                    </span>
                  </div>

                  {/* Action Buttons Footer */}
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      paddingTop: "10px",
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      style={{
                        flex: 1,
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        color: "#166534",
                        padding: "6px 8px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      👁️ Preview
                    </button>

                    {/* Download Button */}
                    <a
                      href={fullUrl}
                      download={doc.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        color: "#1e40af",
                        padding: "6px 8px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        textAlign: "center",
                        textDecoration: "none",
                      }}
                    >
                      ⬇️ Download
                    </a>

                    {/* Delete Button */}
                    <button
                      type="button"
                      disabled={deletingId === doc.id}
                      onClick={() => handleDelete(doc.id, doc.fileName)}
                      title="Delete document"
                      style={{
                        background: "#fff1f2",
                        border: "1px solid #fecdd3",
                        color: "#be123c",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: deletingId === doc.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {deletingId === doc.id ? "⏳" : "🗑️"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT PREVIEW MODAL                                                    */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                  {previewDoc.fileName}
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  {previewDoc.fileSizeFormatted} • Uploaded by {previewDoc.uploadedByUserName || "Companion"} •{" "}
                  {previewDoc.storageType === "CLOUD" || (previewDoc.storageUrl && previewDoc.storageUrl.startsWith("http")) ? "☁️ Cloud (Cloudinary)" : "💻 Local Server Disk"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "20px",
                overflowY: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f8fafc",
                minHeight: "350px",
              }}
            >
              {previewDoc.fileType?.startsWith("image/") ? (
                <img
                  src={vaultService.getFileUrl(previewDoc.storageUrl)}
                  alt={previewDoc.fileName}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "65vh",
                    objectFit: "contain",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
              ) : previewDoc.fileType === "application/pdf" ? (
                <iframe
                  src={vaultService.getFileUrl(previewDoc.storageUrl)}
                  title={previewDoc.fileName}
                  style={{
                    width: "100%",
                    height: "65vh",
                    border: "none",
                    borderRadius: "8px",
                  }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <span style={{ fontSize: "64px", display: "block", marginBottom: "12px" }}>📄</span>
                  <p style={{ color: "#334155", fontWeight: "700", fontSize: "15px" }}>
                    In-browser preview is not supported for this file type.
                  </p>
                  <a
                    href={vaultService.getFileUrl(previewDoc.storageUrl)}
                    download={previewDoc.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: "12px",
                      background: "#059669",
                      color: "#ffffff",
                      padding: "8px 18px",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "13px",
                      textDecoration: "none",
                    }}
                  >
                    ⬇️ Download File to View
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <a
                href={vaultService.getFileUrl(previewDoc.storageUrl)}
                download={previewDoc.fileName}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "#059669",
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
              >
                ⬇️ Download Original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentVaultTab;
