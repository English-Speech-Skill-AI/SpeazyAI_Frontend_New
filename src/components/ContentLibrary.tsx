import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import {
    ArrowLeft,
    Upload,
    Eye,
    FileText,
    Plus,
    Library,
    Sparkles,
    CheckCircle2,
    XCircle,
    ExternalLink,
    X,
    BookOpen,
    GraduationCap,
    School,
    BookMarked,
    Notebook,
    BookCheck,
    BookA,
    BookX,
    Book,
    Award,
    Star,
    Rocket,
    Globe,
    Lightbulb,
    Target,
    Zap,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

interface ContentItem {
    id: string;
    title: string;
    className: string;
    chapter: string;
    pdfUrl: string;
    uploadDate: string;
}

// Array of icons for random assignment
const contentIcons = [
    BookOpen,
    GraduationCap,
    School,
    BookMarked,
    Notebook,
    BookCheck,
    BookA,
    Book,
    FileText,
    Award,
    Star,
    Rocket,
    Globe,
    Lightbulb,
    Target,
    Zap,
];

// Array of gradient colors for icon backgrounds
const iconGradients = [
    "from-[#3B82F6] to-[#00B9FC]",
    "from-[#1E3A8A] to-[#3B82F6]",
    "from-[#00B9FC] to-[#3B82F6]",
    "from-[#6366F1] to-[#8B5CF6]",
    "from-[#EC4899] to-[#F43F5E]",
    "from-[#F59E0B] to-[#EF4444]",
    "from-[#10B981] to-[#059669]",
    "from-[#8B5CF6] to-[#EC4899]",
];

// Get icon and gradient based on item ID (consistent per item)
const getItemIcon = (itemId: string) => {
    // Convert ID to a number for consistent icon assignment
    let hash = 0;
    for (let i = 0; i < itemId.length; i++) {
        hash = itemId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % contentIcons.length;
    return contentIcons[index];
};

const getItemGradient = (itemId: string) => {
    // Convert ID to a number for consistent gradient assignment
    let hash = 0;
    for (let i = 0; i < itemId.length; i++) {
        hash = itemId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % iconGradients.length;
    return iconGradients[index];
};

interface ContentLibraryProps {
    onBack?: () => void;
}

export function ContentLibrary({ onBack }: ContentLibraryProps) {
    const navigate = useNavigate()
    const location = useLocation()
    const backRoute = (location.state as any)?.backRoute || "/reading-modules"
    
    const handleBack = () => {
        if (onBack) {
            onBack()
        } else {
            navigate(backRoute)
        }
    }
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [isLoadingContent, setIsLoadingContent] = useState(true);

    const { authData, token } = useAuth();

    // Helper function to map API response to ContentItem
    const mapApiItemToContentItem = (item: any): ContentItem => ({
        id: item.id?.toString() || item.content_id?.toString() || Date.now().toString(),
        title: item.title || "",
        className: item.class_name || item.className || "",
        chapter: item.chapterName || item.chapter_name || item.chapter || "",
        pdfUrl: item.pdf_url || item.pdfUrl || "",
        uploadDate: item.upload_date || item.uploadDate || item.created_at || new Date().toISOString().split("T")[0],
    });

    // Fetch content items from API on component mount
    useEffect(() => {
        const fetchContentItems = async () => {
            if (!token) {
                setIsLoadingContent(false);
                return;
            }

            try {
                setIsLoadingContent(true);
                const response = await fetch("https://api.intelliviq.com/api/content/list.php", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch content: ${response.status}`);
                }

                const data = await response.json();

                // Handle different response formats
                let items: ContentItem[] = [];
                
                if (data.success && Array.isArray(data.data)) {
                    items = data.data.map(mapApiItemToContentItem);
                } else if (Array.isArray(data)) {
                    items = data.map(mapApiItemToContentItem);
                }

                setContentItems(items);
            } catch (error) {
                toast.error("Failed to load content library. Please try again.");
                setContentItems([]);
            } finally {
                setIsLoadingContent(false);
            }
        };

        fetchContentItems();
    }, [token]);

    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [chapterName, setChapterName] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    // Upload state
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
    const [publicUrl, setPublicUrl] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>("");

    // Check if current user is administrator (admins see all classes)
    const isAdministrator = (): boolean => {
        if (!authData?.user?.role) return false;
        const role = (authData.user.role || "").toLowerCase();
        return role === "administrator" || role.includes("admin");
    };

    // Get user's assigned classes from auth data
    const getUserClasses = (): string[] => {
        if (!authData?.user?.class) {
            return [];
        }
        
        // Handle both string and string[] types
        if (Array.isArray(authData.user.class)) {
            return authData.user.class;
        }
        
        // If it's a single string, return as array
        return [authData.user.class];
    };

    // Fallback class list when none available
    const fallbackClasses = [
        "Grade 4A", "Grade 4B", "Grade 4C",
        "Grade 5A", "Grade 5B", "Grade 5C",
        "Grade 6A", "Grade 6B", "Grade 6C",
    ];

    // Normalize: split comma-separated and deduplicate
    const userClasses = getUserClasses();
    const userClassesNormalized = [...new Set(
        userClasses.flatMap((c) =>
            c.split(",").map((s) => s.trim()).filter(Boolean)
        )
    )];

    // For admins: show all classes (from existing content + user's classes). For others: only assigned classes.
    const classesFromContent = [...new Set(
        contentItems.map((item) => item.className).filter(Boolean)
    )];
    const classOptions = isAdministrator()
        ? (() => {
            const combined = [...new Set([...classesFromContent, ...userClassesNormalized])];
            return combined.length > 0 ? combined.sort() : fallbackClasses;
          })()
        : userClassesNormalized.length > 0 ? userClassesNormalized : fallbackClasses;

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate PDF type
            if (file.type !== "application/pdf") {
                toast.error("Please select a PDF file only");
                event.target.value = ""; // Reset input
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
            setErrorMessage("");
        }
    };

    // Smooth progress animation helper
    const animateProgress = (targetProgress: number, duration: number = 1000) => {
        return new Promise<void>((resolve) => {
            const startProgress = uploadProgress;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const currentProgress = startProgress + (targetProgress - startProgress) * progress;
                setUploadProgress(currentProgress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            animate();
        });
    };

    const handleUpload = async () => {
        // Validation
        if (!newTitle.trim()) {
            toast.error("Please enter a title");
            return;
        }
        if (!selectedClass) {
            toast.error("Please select a class");
            return;
        }
        if (!chapterName.trim()) {
            toast.error("Please enter a chapter name");
            return;
        }
        if (!selectedFile) {
            toast.error("Please select a PDF file");
            return;
        }

        // Validate PDF type again
        if (selectedFile.type !== "application/pdf") {
            toast.error("Only PDF files are allowed");
            return;
        }

        setIsUploading(true);
        setUploadStatus("uploading");
        setUploadProgress(0);
        setErrorMessage("");
        setPublicUrl(null);

        try {
            // Step 1: Upload PDF (0% -> 70%)
            await animateProgress(30, 800);
            
            const formData = new FormData();
            formData.append("file", selectedFile);

            const uploadResponse = await fetch("https://api.intelliviq.com/upload-pdf", {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error("PDF upload failed");
            }

            const { publicUrl } = await uploadResponse.json();

            // Step 2: Save metadata to backend (70% -> 100%)
            await animateProgress(100, 800);

            if (!token) {
                throw new Error("Authentication token not available. Please log in again.");
            }

            const saveMetadataResponse = await fetch("https://api.intelliviq.com/api/content/create.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    class_name: selectedClass,
                    userId: authData?.user?.id || 12,
                    chapter_name: chapterName.trim(),
                    pdf_url: publicUrl,
                }),
            });

            if (!saveMetadataResponse.ok) {
                throw new Error("Failed to save content metadata");
            }

            const savedData = await saveMetadataResponse.json();

            // Success!
            setUploadStatus("success");
            setPublicUrl(publicUrl);
            
            // Add to content items list (at the beginning for most recent first)
            const newItem: ContentItem = {
                id: savedData.id?.toString() || savedData.data?.id?.toString() || Date.now().toString(),
                title: newTitle.trim(),
                className: selectedClass,
                chapter: chapterName.trim(),
                pdfUrl: publicUrl,
                uploadDate: new Date().toISOString().split("T")[0],
            };
            
            // Update state immediately using functional update to ensure it works
            setContentItems(prevItems => {
                // Check if item already exists to avoid duplicates
                const exists = prevItems.some(item => item.id === newItem.id);
                if (exists) {
                    return prevItems;
                }
                return [newItem, ...prevItems];
            });
            
            toast.success("Content uploaded successfully!");
            
            // Refresh the list from API after upload to ensure consistency
            setTimeout(async () => {
                if (!token) return;
                
                try {
                    const response = await fetch("https://api.intelliviq.com/api/content/list.php", {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`,
                        },
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        let items: ContentItem[] = [];
                        
                        if (data.success && Array.isArray(data.data)) {
                            items = data.data.map(mapApiItemToContentItem);
                        } else if (Array.isArray(data)) {
                            items = data.map(mapApiItemToContentItem);
                        }
                        
                        setContentItems(items);
                    }
                } catch (error) {
                    // Silently fail - user already sees the new item
                }
            }, 1500);
            
            // Reset form after 3 seconds (give time to see the new item)
            setTimeout(() => {
                resetForm();
            }, 3000);

        } catch (error) {
            setUploadStatus("error");
            setUploadProgress(0);
            const errorMsg = error instanceof Error ? error.message : "Upload failed. Please try again.";
            setErrorMessage(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = () => {
            setNewTitle("");
        setSelectedClass("");
        setChapterName("");
            setSelectedFile(null);
        setUploadProgress(0);
        setUploadStatus("idle");
        setPublicUrl(null);
        setErrorMessage("");
            setIsUploadDialogOpen(false);
    };

    const handleDialogClose = (open: boolean) => {
        if (!open && !isUploading) {
            resetForm();
        }
        setIsUploadDialogOpen(open);
    };

    const handleQuickView = () => {
        if (publicUrl) {
            window.open(publicUrl, "_blank");
        }
    };

    const TEXT_LIGHT = "#F2F6FF";
    const TEXT_MUTED = "rgba(242,246,255,0.78)";

    const BLUE_BG: React.CSSProperties = {
        backgroundColor: "#123A8A",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
    };

    return (
        <>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .pulse-animation {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        <div className="min-h-screen relative overflow-x-hidden">
            {/* Background */}
            <div className="absolute inset-0 -z-10" style={BLUE_BG} />

            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBack}
                                className="hover:bg-white/10"
                                style={{ color: TEXT_LIGHT }}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                                style={{ background: "#3B82F6" }}
                            >
                                <Library className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-lg" style={{ color: TEXT_LIGHT }}>
                                Content Library
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <Dialog open={isUploadDialogOpen} onOpenChange={handleDialogClose}>
                                <DialogTrigger asChild>
                                    <Button
                                        style={{
                                            background: "linear-gradient(135deg, #3B82F6 0%, #00B9FC 100%)",
                                            color: "#FFFFFF",
                                            borderRadius: "12px",
                                            padding: "8px 16px",
                                            boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.2)",
                                            border: "none",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            fontWeight: 500,
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "scale(1.05)";
                                            e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(59, 130, 246, 0.3)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "scale(1)";
                                            e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.2)";
                                        }}
                                    >
                                        <Plus style={{ width: "16px", height: "16px" }} />
                                        Upload Content
                                    </Button>
                                </DialogTrigger>
                            <DialogContent 
                                style={{
                                    backgroundColor: "#FFFFFF",
                                    maxWidth: "600px",
                                    width: "90vw",
                                    maxHeight: "90vh",
                                    overflowY: "auto",
                                    borderRadius: "16px",
                                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                                    padding: "0",
                                    border: "none",
                                }}
                            >
                                <DialogHeader
                                    style={{
                                        padding: "24px 24px 16px 24px",
                                        borderBottom: "1px solid #E5E7EB",
                                    }}
                                >
                                    <DialogTitle 
                                        style={{
                                            color: "#0F1F47",
                                            fontSize: "20px",
                                            fontWeight: 600,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px",
                                            margin: 0,
                                        }}
                                    >
                                        <Upload style={{ width: "20px", height: "20px", color: "#3B82F6" }} />
                                        Upload New Content
                                    </DialogTitle>
                                    <DialogDescription 
                                        style={{
                                            color: "rgba(15, 31, 71, 0.7)",
                                            fontSize: "14px",
                                            marginTop: "8px",
                                            lineHeight: "1.5",
                                        }}
                                    >
                                        Add a new PDF document to your content library. All files are stored securely.
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                                    {/* Class Dropdown */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <Label 
                                            htmlFor="class" 
                                            style={{
                                                color: "#0F1F47",
                                                fontWeight: 500,
                                                fontSize: "14px",
                                            }}
                                        >
                                            Class <span style={{ color: "#EF4444" }}>*</span>
                                        </Label>
                                        <div style={{ position: "relative", width: "100%" }}>
                                            <Select
                                                value={selectedClass}
                                                onValueChange={setSelectedClass}
                                                disabled={isUploading || classOptions.length === 0}
                                            >
                                                <SelectTrigger 
                                                    id="class"
                                                    style={{
                                                        border: "1px solid #E5E7EB",
                                                        borderRadius: "8px",
                                                        height: "44px",
                                                        padding: "0 12px",
                                                        fontSize: "14px",
                                                        backgroundColor: isUploading || classOptions.length === 0 ? "#F3F4F6" : "#FFFFFF",
                                                        cursor: isUploading || classOptions.length === 0 ? "not-allowed" : "pointer",
                                                        color: selectedClass ? "#0F1F47" : "rgba(15, 31, 71, 0.6)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        width: "100%",
                                                        outline: "none",
                                                        transition: "all 0.2s ease",
                                                        opacity: isUploading || classOptions.length === 0 ? 0.6 : 1,
                                                    }}
                                                    onFocus={(e) => {
                                                        if (!isUploading && classOptions.length > 0) {
                                                            e.currentTarget.style.borderColor = "#3B82F6";
                                                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        e.currentTarget.style.borderColor = "#E5E7EB";
                                                        e.currentTarget.style.boxShadow = "none";
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isUploading && classOptions.length > 0) {
                                                            e.currentTarget.style.borderColor = "#3B82F6";
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isUploading) {
                                                            e.currentTarget.style.borderColor = "#E5E7EB";
                                                        }
                                                    }}
                                                >
                                                    <SelectValue 
                                                        placeholder={classOptions.length === 0 ? "No classes assigned" : "Select a class"}
                                                        style={{
                                                            color: selectedClass ? "#0F1F47" : "rgba(15, 31, 71, 0.6)",
                                                            display: "block",
                                                            width: "100%",
                                                        }}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent
                                                    style={{
                                                        backgroundColor: "#FFFFFF",
                                                        border: "1px solid #E5E7EB",
                                                        borderRadius: "8px",
                                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                                        padding: "4px",
                                                        zIndex: 9999,
                                                        minWidth: "var(--radix-select-trigger-width)",
                                                        maxHeight: "300px",
                                                        overflowY: "auto",
                                                    }}
                                                >
                                                    {classOptions.length > 0 ? (
                                                        classOptions.map((className) => (
                                                            <SelectItem 
                                                                key={className} 
                                                                value={className}
                                                                style={{
                                                                    padding: "8px 12px",
                                                                    borderRadius: "6px",
                                                                    cursor: "pointer",
                                                                    fontSize: "14px",
                                                                    color: "#0F1F47",
                                                                    outline: "none",
                                                                    backgroundColor: "transparent",
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = "transparent";
                                                                }}
                                                            >
                                                                {className}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem 
                                                            value="no-class"
                                                            disabled
                                                            style={{
                                                                padding: "8px 12px",
                                                                fontSize: "14px",
                                                                color: "rgba(15, 31, 71, 0.5)",
                                                                cursor: "not-allowed",
                                                            }}
                                                        >
                                                            No classes assigned
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Title Input */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <Label 
                                            htmlFor="title" 
                                            style={{
                                                color: "#0F1F47",
                                                fontWeight: 500,
                                                fontSize: "14px",
                                            }}
                                        >
                                            Title <span style={{ color: "#EF4444" }}>*</span>
                                        </Label>
                                        <Input
                                            id="title"
                                            placeholder="Enter content title"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            disabled={isUploading}
                                            style={{
                                                border: "1px solid #E5E7EB",
                                                borderRadius: "8px",
                                                height: "44px",
                                                padding: "0 12px",
                                                fontSize: "14px",
                                                backgroundColor: isUploading ? "#F3F4F6" : "#FFFFFF",
                                                color: "#0F1F47",
                                            }}
                                        />
                                    </div>

                                    {/* Chapter Input */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <Label 
                                            htmlFor="chapter" 
                                            style={{
                                                color: "#0F1F47",
                                                fontWeight: 500,
                                                fontSize: "14px",
                                            }}
                                        >
                                            Chapter <span style={{ color: "#EF4444" }}>*</span>
                                        </Label>
                                        <Input
                                            id="chapter"
                                            placeholder="Enter chapter name"
                                            value={chapterName}
                                            onChange={(e) => setChapterName(e.target.value)}
                                            disabled={isUploading}
                                            style={{
                                                border: "1px solid #E5E7EB",
                                                borderRadius: "8px",
                                                height: "44px",
                                                padding: "0 12px",
                                                fontSize: "14px",
                                                backgroundColor: isUploading ? "#F3F4F6" : "#FFFFFF",
                                                color: "#0F1F47",
                                            }}
                                        />
                                    </div>

                                    {/* PDF File Upload */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <Label 
                                            htmlFor="file" 
                                            style={{
                                                color: "#0F1F47",
                                                fontWeight: 500,
                                                fontSize: "14px",
                                            }}
                                        >
                                            PDF File <span style={{ color: "#EF4444" }}>*</span>
                                        </Label>
                                        <div style={{ position: "relative" }}>
                                            <input
                                                id="file"
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleFileUpload}
                                                disabled={isUploading}
                                                style={{
                                                    position: "absolute",
                                                    width: "0.1px",
                                                    height: "0.1px",
                                                    opacity: 0,
                                                    overflow: "hidden",
                                                    zIndex: -1,
                                                }}
                                            />
                                            <label
                                                htmlFor="file"
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    width: "100%",
                                                    height: "44px",
                                                    border: "1px solid #E5E7EB",
                                                    borderRadius: "8px",
                                                    padding: "0 16px",
                                                    fontSize: "14px",
                                                    backgroundColor: isUploading ? "#F3F4F6" : "#FFFFFF",
                                                    cursor: isUploading ? "not-allowed" : "pointer",
                                                    color: selectedFile ? "#0F1F47" : "rgba(15, 31, 71, 0.6)",
                                                    fontWeight: selectedFile ? 500 : 400,
                                                    transition: "all 0.2s ease",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isUploading) {
                                                        e.currentTarget.style.borderColor = "#3B82F6";
                                                        e.currentTarget.style.backgroundColor = "#F8F9FA";
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isUploading) {
                                                        e.currentTarget.style.borderColor = "#E5E7EB";
                                                        e.currentTarget.style.backgroundColor = "#FFFFFF";
                                                    }
                                                }}
                                            >
                                                {selectedFile ? (
                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
                                                        {selectedFile.name}
                                                    </span>
                                                ) : (
                                                    <>
                                                        <Upload style={{ width: "16px", height: "16px", marginRight: "8px", color: "#3B82F6" }} />
                                                        Choose file
                                                    </>
                                                )}
                                            </label>
                                            {selectedFile && (
                                                <div 
                                                    style={{
                                                        marginTop: "12px",
                                                        padding: "12px",
                                                        backgroundColor: "#F8F9FA",
                                                        borderRadius: "8px",
                                                        border: "1px solid #E5E7EB",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "12px",
                                                    }}
                                                >
                                                    <FileText style={{ width: "20px", height: "20px", color: "#3B82F6", flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p 
                                                            style={{
                                                                fontSize: "14px",
                                                                fontWeight: 500,
                                                                color: "#0F1F47",
                                                                margin: 0,
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                    {selectedFile.name}
                                                </p>
                                                        <p 
                                                            style={{
                                                                fontSize: "12px",
                                                                color: "rgba(15, 31, 71, 0.6)",
                                                                margin: "4px 0 0 0",
                                                            }}
                                                        >
                                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <p 
                                            style={{
                                                fontSize: "12px",
                                                color: "rgba(15, 31, 71, 0.6)",
                                                margin: 0,
                                            }}
                                        >
                                            Only PDF files are allowed. Maximum file size: 50MB
                                        </p>
                                    </div>

                                    {/* Progress Bar */}
                                    {isUploading && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px" }}>
                                                <span style={{ color: "#0F1F47", fontWeight: 500 }}>Upload Progress</span>
                                                <span style={{ color: "#3B82F6", fontWeight: 600 }}>{Math.round(uploadProgress)}%</span>
                                </div>
                                            <div 
                                                style={{
                                                    position: "relative",
                                                    height: "12px",
                                                    width: "100%",
                                                    backgroundColor: "#E5E7EB",
                                                    borderRadius: "9999px",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                <div 
                                                    style={{
                                                        height: "100%",
                                                        background: "linear-gradient(90deg, #3B82F6 0%, #00B9FC 100%)",
                                                        borderRadius: "9999px",
                                                        transition: "width 0.3s ease-out",
                                                        width: `${uploadProgress}%`,
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(15, 31, 71, 0.7)" }}>
                                                {uploadProgress < 30 && (
                                                    <span>Generating upload URL...</span>
                                                )}
                                                {uploadProgress >= 30 && uploadProgress < 70 && (
                                                    <span>Uploading PDF to storage...</span>
                                                )}
                                                {uploadProgress >= 70 && uploadProgress < 100 && (
                                                    <span>Saving metadata...</span>
                                                )}
                                                {uploadProgress === 100 && (
                                                    <span style={{ color: "#10B981", fontWeight: 500 }}>Upload complete!</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Success State */}
                                    {uploadStatus === "success" && publicUrl && (
                                        <div 
                                            style={{
                                                padding: "16px",
                                                backgroundColor: "#F0FDF4",
                                                border: "1px solid #BBF7D0",
                                                borderRadius: "8px",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                                <CheckCircle2 style={{ width: "20px", height: "20px", color: "#10B981", flexShrink: 0, marginTop: "2px" }} />
                                                <div style={{ flex: 1 }}>
                                                    <p 
                                                        style={{
                                                            fontSize: "14px",
                                                            fontWeight: 500,
                                                            color: "#065F46",
                                                            margin: "0 0 8px 0",
                                                        }}
                                                    >
                                                        Content uploaded successfully!
                                                    </p>
                                    <Button
                                                        onClick={handleQuickView}
                                                        size="sm"
                                                        style={{
                                                            backgroundColor: "#10B981",
                                                            color: "#FFFFFF",
                                                            border: "none",
                                                            borderRadius: "6px",
                                                            padding: "6px 12px",
                                                            fontSize: "12px",
                                                            fontWeight: 500,
                                                            cursor: "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "6px",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#059669";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#10B981";
                                                        }}
                                                    >
                                                        <ExternalLink style={{ width: "16px", height: "16px" }} />
                                                        Quick View PDF
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error State */}
                                    {uploadStatus === "error" && errorMessage && (
                                        <div 
                                            style={{
                                                padding: "16px",
                                                backgroundColor: "#FEF2F2",
                                                border: "1px solid #FECACA",
                                                borderRadius: "8px",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                                <XCircle style={{ width: "20px", height: "20px", color: "#EF4444", flexShrink: 0, marginTop: "2px" }} />
                                                <div style={{ flex: 1 }}>
                                                    <p 
                                                        style={{
                                                            fontSize: "14px",
                                                            fontWeight: 500,
                                                            color: "#991B1B",
                                                            margin: "0 0 4px 0",
                                                        }}
                                                    >
                                                        Upload Failed
                                                    </p>
                                                    <p 
                                                        style={{
                                                            fontSize: "12px",
                                                            color: "#B91C1C",
                                                            margin: 0,
                                                        }}
                                                    >
                                                        {errorMessage}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* PDF Preview Section (after successful upload) */}
                                    {uploadStatus === "success" && publicUrl && (
                                        <div 
                                            style={{
                                                padding: "16px",
                                                backgroundColor: "#F8F9FA",
                                                border: "1px solid #E5E7EB",
                                                borderRadius: "8px",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <FileText style={{ width: "20px", height: "20px", color: "#3B82F6" }} />
                                                    <span 
                                                        style={{
                                                            fontSize: "14px",
                                                            fontWeight: 500,
                                                            color: "#0F1F47",
                                                        }}
                                                    >
                                                        PDF Preview Available
                                                    </span>
                                                </div>
                                                <Button
                                                    onClick={handleQuickView}
                                                    size="sm"
                                        variant="outline"
                                                    style={{
                                                        border: "1px solid #3B82F6",
                                                        color: "#3B82F6",
                                                        backgroundColor: "transparent",
                                                        borderRadius: "6px",
                                                        padding: "6px 12px",
                                                        fontSize: "12px",
                                                        fontWeight: 500,
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "6px",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#3B82F6";
                                                        e.currentTarget.style.color = "#FFFFFF";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "transparent";
                                                        e.currentTarget.style.color = "#3B82F6";
                                                    }}
                                                >
                                                    <Eye style={{ width: "16px", height: "16px" }} />
                                                    Quick View
                                    </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div 
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: "12px",
                                        padding: "16px 24px 24px 24px",
                                        borderTop: "1px solid #E5E7EB",
                                    }}
                                >
                                    <Button
                                        variant="outline"
                                        onClick={() => handleDialogClose(false)}
                                        disabled={isUploading}
                                        style={{
                                            border: "1px solid #E5E7EB",
                                            color: "#0F1F47",
                                            backgroundColor: "#FFFFFF",
                                            borderRadius: "8px",
                                            padding: "8px 16px",
                                            fontSize: "14px",
                                            fontWeight: 500,
                                            cursor: isUploading ? "not-allowed" : "pointer",
                                            opacity: isUploading ? 0.5 : 1,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isUploading) {
                                                e.currentTarget.style.backgroundColor = "#F2F3F4";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isUploading) {
                                                e.currentTarget.style.backgroundColor = "#FFFFFF";
                                            }
                                        }}
                                    >
                                        {uploadStatus === "success" ? "Close" : "Cancel"}
                                    </Button>
                                    <Button
                                        onClick={handleUpload}
                                        disabled={
                                            isUploading || 
                                            !newTitle.trim() || 
                                            !selectedClass || 
                                            !chapterName.trim() || 
                                            !selectedFile ||
                                            uploadStatus === "success"
                                        }
                                        style={{
                                            background: "linear-gradient(135deg, #3B82F6 0%, #00B9FC 100%)",
                                            color: "#FFFFFF",
                                            borderRadius: "12px",
                                            padding: "8px 20px",
                                            boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.2)",
                                            border: "none",
                                            fontSize: "14px",
                                            fontWeight: 500,
                                            cursor: (isUploading || !newTitle.trim() || !selectedClass || !chapterName.trim() || !selectedFile || uploadStatus === "success") ? "not-allowed" : "pointer",
                                            opacity: (isUploading || !newTitle.trim() || !selectedClass || !chapterName.trim() || !selectedFile || uploadStatus === "success") ? 0.5 : 1,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            transition: "all 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isUploading && newTitle.trim() && selectedClass && chapterName.trim() && selectedFile && uploadStatus !== "success") {
                                                e.currentTarget.style.transform = "scale(1.05)";
                                                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(59, 130, 246, 0.3)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isUploading && newTitle.trim() && selectedClass && chapterName.trim() && selectedFile && uploadStatus !== "success") {
                                                e.currentTarget.style.transform = "scale(1)";
                                                e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.2)";
                                            }
                                        }}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Upload className="pulse-animation" style={{ width: "16px", height: "16px" }} />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Upload style={{ width: "16px", height: "16px" }} />
                                        Upload
                                            </>
                                        )}
                                    </Button>
                                </div>
                                </DialogContent>
                        </Dialog>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-8 h-8 text-[#FFD600]" />
                        <h2 className="text-3xl" style={{ color: TEXT_LIGHT }}>
                            Your Content Library
                        </h2>
                    </div>
                    <p style={{ color: TEXT_MUTED }}>
                        Manage and view all your uploaded learning materials in one place
                    </p>
                </div>

                {/* Content Table */}
                <Card className="bg-white border-0 shadow-xl">
                    <CardHeader className="border-b border-[#E5E7EB]">
                        <CardTitle className="text-[#0F1F47] flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#3B82F6]" />
                            All Content
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#F2F3F4] hover:bg-[#F2F3F4]">
                                        <TableHead className="text-[#0F1F47]">
                                            Title
                                        </TableHead>
                                        <TableHead className="text-[#0F1F47]">
                                            Class Name
                                        </TableHead>
                                        <TableHead className="text-[#0F1F47]">
                                            Chapter
                                        </TableHead>
                                        <TableHead className="text-[#0F1F47]">
                                            Upload Date
                                        </TableHead>
                                        <TableHead className="text-[#0F1F47] text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingContent ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="text-center py-12 text-[#0F1F47]/50"
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                                    <p style={{ margin: 0, color: '#0F1F47' }}>Loading content...</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : contentItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="text-center py-12 text-[#0F1F47]/50"
                                            >
                                                <FileText className="w-12 h-12 mx-auto mb-3 text-[#0F1F47]/30" />
                                                <p className="mb-2">No content uploaded yet</p>
                                                <p className="text-sm">
                                                    Click the "Upload Content" button to get started
                                                </p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        contentItems.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                className="hover:bg-[#F8F9FA] transition-colors"
                                            >
                                                <TableCell className="text-[#0F1F47]">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-[#3B82F6]" />
                                                        {item.title}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-[#0F1F47]/70">
                                                    {item.className}
                                                </TableCell>
                                                <TableCell className="text-[#0F1F47]/70">
                                                    {item.chapter}
                                                </TableCell>
                                                <TableCell className="text-[#0F1F47]/70">
                                                    {new Date(item.uploadDate).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                className="bg-gradient-to-br from-[#3B82F6] to-[#00B9FC] text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                                                            >
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                View PDF
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="bg-white p-0 overflow-hidden" style={{ width: "min(95vw, 1024px)", maxWidth: "95vw", maxHeight: "85vh", height: "85vh", display: "flex", flexDirection: "column" }}>
                                                            <DialogHeader className="p-4 pb-3 border-b border-[#E5E7EB] flex-shrink-0 relative">
                                                                <DialogClose asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        style={{
                                                                            position: 'absolute',
                                                                            top: '12px',
                                                                            right: '12px',
                                                                            width: '36px',
                                                                            height: '36px',
                                                                            borderRadius: '8px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            backgroundColor: 'transparent',
                                                                            color: '#6B7280',
                                                                            cursor: 'pointer',
                                                                            zIndex: 10,
                                                                            border: 'none',
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.backgroundColor = '#F3F4F6';
                                                                            e.currentTarget.style.color = '#0F1F47';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                                            e.currentTarget.style.color = '#6B7280';
                                                                        }}
                                                                    >
                                                                        <X style={{ width: '20px', height: '20px' }} />
                                                                    </Button>
                                                                </DialogClose>
                                                                <DialogTitle className="text-[#0F1F47] flex items-center gap-2 text-lg pr-10">
                                                                    <FileText className="w-5 h-5 text-[#3B82F6]" />
                                                                    {item.title}
                                                                </DialogTitle>
                                                                <DialogDescription className="text-[#0F1F47]/70 text-sm mt-1">
                                                                    {item.className} • {item.chapter} • Uploaded on{" "}
                                                                    {new Date(item.uploadDate).toLocaleDateString()}
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div style={{ 
                                                                flex: 1,
                                                                display: 'flex', 
                                                                flexDirection: 'column',
                                                                backgroundColor: '#F8F9FA',
                                                                overflow: 'hidden',
                                                                minHeight: 0
                                                            }}>
                                                                {item.pdfUrl ? (
                                                                    <>
                                                                        <div style={{ 
                                                                            flex: 1, 
                                                                            position: 'relative', 
                                                                            overflow: 'hidden',
                                                                            width: '100%',
                                                                            minHeight: 0
                                                                        }}>
                                                                            <iframe
                                                                                key={item.pdfUrl}
                                                                                src={`${item.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=100`}
                                                                                style={{ 
                                                                                    width: "100%", 
                                                                                    height: "100%", 
                                                                                    border: "none",
                                                                                    display: "block"
                                                                                }}
                                                                                title={item.title}
                                                                                allowFullScreen={false}
                                                                                loading="lazy"
                                                                            />
                                                                        </div>
                                                                        <div style={{ 
                                                                            padding: '10px 16px', 
                                                                            display: 'flex', 
                                                                            gap: '8px', 
                                                                            borderTop: '1px solid #E5E7EB', 
                                                                            width: '100%', 
                                                                            justifyContent: 'flex-end',
                                                                            backgroundColor: '#FFFFFF',
                                                                            flexShrink: 0
                                                                        }}>
                                                                            <Button
                                                                                onClick={() => window.open(item.pdfUrl, '_blank', 'noopener,noreferrer')}
                                                                                size="sm"
                                                                                style={{
                                                                                    backgroundColor: "#3B82F6",
                                                                                    color: "#FFFFFF",
                                                                                    border: "none",
                                                                                    borderRadius: "6px",
                                                                                    padding: "8px 16px",
                                                                                    fontSize: "14px",
                                                                                    fontWeight: 500,
                                                                                    cursor: "pointer",
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    gap: "8px",
                                                                                    transition: "background-color 0.2s ease",
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                    e.currentTarget.style.backgroundColor = "#2563EB";
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                    e.currentTarget.style.backgroundColor = "#3B82F6";
                                                                                }}
                                                                            >
                                                                                <ExternalLink style={{ width: "16px", height: "16px" }} />
                                                                                Open in New Tab
                                                                            </Button>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div style={{ 
                                                                        textAlign: 'center', 
                                                                        padding: '48px 24px',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        height: '100%'
                                                                    }}>
                                                                        <FileText style={{ width: "64px", height: "64px", color: "#9CA3AF", margin: "0 auto 16px" }} />
                                                                        <p style={{ color: "#6B7280", fontSize: "14px", margin: 0, fontWeight: 500 }}>PDF URL not available</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <Card className="mt-6 bg-gradient-to-br from-[#3B82F6] to-[#00B9FC] border-0 shadow-xl">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-5 h-5 text-[#FFD600]" />
                            </div>
                            <div>
                                <h3 className="text-white mb-1">
                                    Upload Your Own Materials
                                </h3>
                                <p className="text-white/90 text-sm">
                                    Add your presentations, speech notes, and learning materials to practice with personalized content. All files are stored securely and can be accessed anytime.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </>
    );
}
