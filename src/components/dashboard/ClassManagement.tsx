"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../ui/button"
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "sonner"
import {
  Mic2,
  Briefcase,
  Users,
  Settings,
  Shield,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronUp,
  ChevronRight,
  Plus,
  Edit,
  Upload,
  UserPlus,
  X,
  Check,
  ChevronDown,
  Menu,
  List,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"
import { getExelerateApiBase } from "../../config/apiConfig"

interface User {
  id: string
  user_id?: number
  name: string
  email: string
  role: "Student" | "Teacher" | "Principal" | "Administrator"
  classes: string | number
  organization: string
  organisation_id?: number
  isActive?: boolean
}

// Roles that can be assigned in Add/Edit User (Admin: all 3; Principal: Teacher, Student; Teacher: Student only)
type AssignableRole = "Student" | "Teacher" | "Principal"

interface Organisation {
  id: number
  organisation: string
}

export function ClassManagement() {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [filterOrganization, setFilterOrganization] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState<keyof User | "">("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [searchInput, setSearchInput] = useState("")
  const [showAddUserForm, setShowAddUserForm] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showAssignClassDialog, setShowAssignClassDialog] = useState(false)
  const [showUploadCSVDialog, setShowUploadCSVDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userToToggle, setUserToToggle] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { authData, logout, token } = useAuth()
  const apiBase = getExelerateApiBase() + "/api"
  
  // Get API token from auth context
  const API_TOKEN = token || ""

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "Student" as User["role"],
    classes: "",
    organization: "",
    organisation_id: "",
  })

  // Assign Class form state
  const [assignClassForm, setAssignClassForm] = useState({
    filterOrganization: "all",
    selectedUserId: "",
    classes: "",
  })

  // Add/Update Classes (org-level) dialog - Principal and Admin only
  const [showClassesUpdateDialog, setShowClassesUpdateDialog] = useState(false)
  const [classesUpdateOrgId, setClassesUpdateOrgId] = useState<string>("")
  const [classesUpdateList, setClassesUpdateList] = useState("")
  const [classesUpdateLoading, setClassesUpdateLoading] = useState(false)
  const [classesUpdateError, setClassesUpdateError] = useState<string | null>(null)

  // Organizations from API
  const [organizations, setOrganizations] = useState<Organisation[]>([])
  const [organizationsList, setOrganizationsList] = useState<string[]>(["All Organizations"])
  
  // Classes from API (extracted from users - classes are in array format)
  const [availableClasses, setAvailableClasses] = useState<string[]>([])
  // Org classes from org/classes/list.php (Principal/Admin) - fetched when Class dropdown or Assign Class dialog is used
  const [orgClassesList, setOrgClassesList] = useState<string[]>([])
  const [orgClassesListLoading, setOrgClassesListLoading] = useState(false)
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [classInputValue, setClassInputValue] = useState("")
  
  // Searchable dropdown states
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false)
  const [orgSearchTerm, setOrgSearchTerm] = useState("")
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [roleSearchTerm, setRoleSearchTerm] = useState("")
  const [isFilterOrgDropdownOpen, setIsFilterOrgDropdownOpen] = useState(false)
  const [filterOrgSearchTerm, setFilterOrgSearchTerm] = useState("")
  const [isAssignOrgDropdownOpen, setIsAssignOrgDropdownOpen] = useState(false)
  const [assignOrgSearchTerm, setAssignOrgSearchTerm] = useState("")
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [isAssignClassesDropdownOpen, setIsAssignClassesDropdownOpen] = useState(false)
  const [assignDialogUsers, setAssignDialogUsers] = useState<User[]>([])
  const [assignDialogUsersLoading, setAssignDialogUsersLoading] = useState(false)
  const [assignClassSubmitting, setAssignClassSubmitting] = useState(false)

  const [users, setUsers] = useState<User[]>([])

  const menuItems = [
    { id: "english-skill-ai", label: "English Skill AI", icon: Mic2, route: "/skills-home" },
    { id: "dashboard", label: "Dashboard", icon: Briefcase, route: "/progress-dashboard" },
    { id: "class-management", label: "Class Management", icon: Users, route: "/progress-dashboard/classes", active: true },
    { id: "license-management", label: "License Management", icon: Shield, route: "/progress-dashboard/license" },
  ]

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true)
      }
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (!showAddUserModal) {
      setIsOrgDropdownOpen(false)
      setIsRoleDropdownOpen(false)
      setOrgSearchTerm("")
      setRoleSearchTerm("")
    }
  }, [showAddUserModal])

  useEffect(() => {
    if (!showAssignClassDialog) {
      setIsAssignOrgDropdownOpen(false)
      setIsUserDropdownOpen(false)
      setIsAssignClassesDropdownOpen(false)
      setAssignOrgSearchTerm("")
      setUserSearchTerm("")
    }
  }, [showAssignClassDialog])

  // When Assign Class dialog is open (Principal/Admin), fetch org classes from list.php. API requires organisation_id for Admin.
  useEffect(() => {
    if (!showAssignClassDialog || !(isAdministrator() || isPrincipal())) return
    let orgId: number | null = null
    if (isPrincipal() && authData?.user?.organisation_id != null) orgId = Number(authData.user.organisation_id)
    if (isAdministrator()) {
      if (assignClassForm.filterOrganization !== "all") {
        const org = organizations.find((o) => o.organisation === assignClassForm.filterOrganization)
        if (org?.id) orgId = org.id
      }
      if (orgId == null) {
        setOrgClassesListLoading(false)
        setOrgClassesList([])
        return
      }
    }
    let cancelled = false
    setOrgClassesListLoading(true)
    fetchOrgClassesList(orgId).then((list) => {
      if (!cancelled) setOrgClassesList(list)
    }).catch(() => { if (!cancelled) setOrgClassesList([]) }).finally(() => { if (!cancelled) setOrgClassesListLoading(false) })
    return () => { cancelled = true }
  }, [showAssignClassDialog, assignClassForm.filterOrganization, authData?.user?.organisation_id, organizations])

  // When Assign Class dialog is open, load users for the selected organisation so the Select User dropdown is populated
  useEffect(() => {
    if (!showAssignClassDialog || !(isAdministrator() || isPrincipal())) return
    let orgId: number | null = null
    let orgName = "All Organizations"
    if (isPrincipal() && authData?.user?.organisation_id != null) {
      orgId = Number(authData.user.organisation_id)
      orgName = organizations.find((o) => o.id === orgId || o.id === Number(authData?.user?.organisation_id))?.organisation ?? orgName
    }
    if (isAdministrator()) {
      if (assignClassForm.filterOrganization === "all") {
        orgId = null
        orgName = "All Organizations"
      } else {
        const org = organizations.find((o) => o.organisation === assignClassForm.filterOrganization)
        if (org?.id) {
          orgId = org.id
          orgName = org.organisation
        }
      }
    }
    let cancelled = false
    setAssignDialogUsersLoading(true)
    fetchUsers({ page: 1, per_page: 500, organisation_id: orgId ?? undefined })
      .then((response) => {
        if (cancelled || !response?.data || !Array.isArray(response.data)) return
        const list: User[] = response.data.map((user: any) => {
          const userOrgId = user.organisation_id ?? user.organization_id
          const resolvedOrg = organizations.find((o) => (o.id ? Number(o.id) : null) === (userOrgId ? Number(userOrgId) : null))
          const name = `${user.first_name || ""} ${user.last_name || ""}`.trim()
          const userClasses = user.class || []
          let classesDisplay = "None"
          if (Array.isArray(userClasses) && userClasses.length > 0) classesDisplay = userClasses.join(", ")
          else if (userClasses && String(userClasses).trim()) classesDisplay = String(userClasses).trim()
          return {
            id: user.id?.toString() || user.user_id?.toString() || "",
            user_id: user.user_id ?? user.id,
            name: name || "Unknown",
            email: user.email || "",
            role: mapApiRoleToUIRole(user.role || "student"),
            classes: classesDisplay,
            organization: resolvedOrg?.organisation ?? (userOrgId ? `Org ID: ${userOrgId}` : orgName),
            organisation_id: userOrgId,
            isActive: user.is_active !== 0 && user.is_active !== "0" && user.is_active !== false,
          }
        })
        setAssignDialogUsers(list)
      })
      .catch(() => { if (!cancelled) setAssignDialogUsers([]) })
      .finally(() => { if (!cancelled) setAssignDialogUsersLoading(false) })
    return () => { cancelled = true }
  }, [showAssignClassDialog, assignClassForm.filterOrganization, authData?.user?.organisation_id, organizations])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest("[data-dropdown]")) {
        setIsOrgDropdownOpen(false)
        setIsRoleDropdownOpen(false)
        setIsFilterOrgDropdownOpen(false)
        setIsAssignOrgDropdownOpen(false)
        setIsUserDropdownOpen(false)
        setIsAssignClassesDropdownOpen(false)
        setShowClassDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getInitials = (name: string) => {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  // Map API role to UI role (API uses student, teacher, principal, administrator)
  const mapApiRoleToUIRole = (apiRole: string): User["role"] => {
    const roleMap: Record<string, User["role"]> = {
      student: "Student",
      teacher: "Teacher",
      manager: "Principal",
      administrator: "Administrator",
      admin: "Administrator",
      principal: "Principal",
    }
    return roleMap[apiRole.toLowerCase()] || "Student"
  }

  // Map UI role to API role
  const mapUIRoleToApiRole = (uiRole: User["role"]): string => {
    const roleMap: Record<string, string> = {
      Student: "student",
      Teacher: "teacher",
      Principal: "principal",
      Administrator: "administrator",
    }
    return roleMap[uiRole] || "student"
  }

  const parseErrorMessage = (error: any): string => {
    const errorMessage = error?.message || "An unexpected error occurred"
    try {
      const jsonMatch = errorMessage.match(/\{.*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.message) return parsed.message
        if (parsed.error) return parsed.error
      }
      if (errorMessage.includes("API Error")) {
        const jsonMatch2 = errorMessage.match(/\{.*\}/)
        if (jsonMatch2) {
          const parsed = JSON.parse(jsonMatch2[0])
          if (parsed.message) return parsed.message
          if (parsed.error) return parsed.error
        }
        const statusMatch = errorMessage.match(/\((\d+)\)/)
        if (statusMatch) {
          const status = parseInt(statusMatch[1])
          if (status === 409) return "This email already exists. Please use a different email address."
          if (status === 400) return "Invalid request. Please check your input and try again."
          if (status === 401) return "You are not authorized to perform this action."
          if (status === 404) return "The requested resource was not found."
          if (status === 500) return "Server error. Please try again later."
        }
      }
    } catch {
      if (errorMessage.includes("API Error")) {
        const cleaned = errorMessage.replace(/^API Error \(\d+\):\s*/, "")
        if (cleaned && cleaned !== errorMessage) return cleaned
      }
    }
    return errorMessage
  }

  const isAdministrator = () => {
    if (!authData?.user?.role) return false
    const userRole = (authData.user.role || "").toLowerCase()
    return userRole === "administrator" || userRole.includes("admin")
  }

  // Admin: Student, Teacher, Principal. Principal: Teacher, Student. Teacher: Student only.
  const getAllowedRoles = (): AssignableRole[] => {
    if (!authData?.user?.role) return ["Student"]
    const userRole = (authData.user.role || "").toLowerCase()
    if (userRole === "administrator" || userRole.includes("admin")) {
      return ["Student", "Teacher", "Principal"]
    }
    if (userRole === "principal" || userRole.includes("principal")) {
      return ["Teacher", "Student"]
    }
    if (userRole === "teacher" || userRole.includes("teacher")) {
      return ["Student"]
    }
    return ["Student"]
  }

  const isPrincipal = () => {
    if (!authData?.user?.role) return false
    const userRole = (authData.user.role || "").toLowerCase()
    return userRole === "principal" || userRole.includes("principal")
  }

  const isTeacher = () => {
    if (!authData?.user?.role) return false
    const userRole = (authData.user.role || "").toLowerCase()
    return userRole === "teacher" || userRole.includes("teacher")
  }

  // Teacher's assigned classes (from auth) - for Class dropdown when role is Teacher
  const teacherAssignedClasses = ((): string[] => {
    const c = authData?.user?.class
    if (!c) return []
    if (Array.isArray(c)) return c.map((x) => String(x).trim()).filter(Boolean)
    if (typeof c === "string") return c.trim() ? [c.trim()] : []
    return []
  })()

  // Classes to show in Class dropdown: org list for Principal/Admin, teacher's classes for Teacher
  const getClassesForDropdown = (): string[] => {
    if (isTeacher()) return teacherAssignedClasses
    return orgClassesList.length ? orgClassesList : availableClasses
  }

  // Load org classes when Principal/Admin opens Class dropdown (Add/Edit User form)
  const loadOrgClassesForDropdown = async () => {
    if (isTeacher()) return
    if (orgClassesListLoading) return
    let orgId: number | null = null
    if (isPrincipal() && authData?.user?.organisation_id != null) orgId = Number(authData.user.organisation_id)
    if (isAdministrator()) {
      const fid = formData.organisation_id && String(formData.organisation_id).trim()
      if (fid) orgId = parseInt(fid, 10)
    }
    setOrgClassesListLoading(true)
    try {
      const list = await fetchOrgClassesList(orgId)
      setOrgClassesList(list)
    } catch {
      setOrgClassesList([])
    } finally {
      setOrgClassesListLoading(false)
    }
  }

  // Load org classes when user opens the Classes dropdown in Assign Class dialog (triggers API on dropdown click)
  const loadAssignDialogClasses = async () => {
    if (orgClassesListLoading) return
    let orgId: number | null = null
    if (isPrincipal() && authData?.user?.organisation_id != null) orgId = Number(authData.user.organisation_id)
    if (isAdministrator()) {
      if (assignClassForm.filterOrganization === "all") return
      const org = organizations.find((o) => o.organisation === assignClassForm.filterOrganization)
      if (org?.id) orgId = org.id
      if (orgId == null) return
    }
    setOrgClassesListLoading(true)
    try {
      const list = await fetchOrgClassesList(orgId)
      setOrgClassesList(list)
    } catch {
      setOrgClassesList([])
    } finally {
      setOrgClassesListLoading(false)
    }
  }

  // API function to fetch organizations list
  const fetchOrganizations = async () => {
    const API_URL = `${apiBase}/org/list.php`

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API Error (${response.status})`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error("Error fetching organizations:", error)
      throw error
    }
  }

  // API function to create user
  const createUser = async (userData: {
    first_name: string
    last_name: string
    email: string
    role: string
    organisation_id: number
    class?: string[] | string // Class can be array or string
  }) => {
    const API_URL = `${apiBase}/users/create.php`

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        try {
          const errorJson = JSON.parse(errorText)
          const errorMessage = errorJson.message || errorJson.error || errorJson.msg || "Failed to create user"
          throw new Error(errorMessage)
        } catch (parseError) {
          throw new Error(errorText || `API Error (${response.status})`)
        }
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error("Error creating user:", error)
      throw error
    }
  }

  // API function to fetch users list with pagination (GET users/list.php?page=1&per_page=20&search=&role=&is_active=&organisation_id=)
  const fetchUsers = async (params: {
    page?: number
    per_page?: number
    search?: string
    role?: string | null
    is_active?: boolean | null
    organisation_id?: number | null
  } = {}) => {
    const sp = new URLSearchParams()
    if (params.page != null) sp.set("page", String(params.page))
    if (params.per_page != null) sp.set("per_page", String(params.per_page))
    if (params.search != null && params.search.trim()) sp.set("search", params.search.trim())
    if (params.role != null && params.role.trim()) sp.set("role", params.role.trim())
    if (params.is_active != null) sp.set("is_active", params.is_active ? "1" : "0")
    if (params.organisation_id != null && params.organisation_id > 0) sp.set("organisation_id", String(params.organisation_id))
    const query = sp.toString()
    const API_URL = `${apiBase}/users/list.php${query ? `?${query}` : ""}`

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API Error (${response.status})`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error("Error fetching users:", error)
      throw error
    }
  }

  const isTeacherOrPrincipal = () => {
    const role = (authData?.user?.role || "").toLowerCase()
    return role === "teacher" || role === "principal" || role.includes("teacher") || role.includes("principal")
  }

  // API: org/classes/list.php - get list of classes (GET; backend may use token for org)
  const fetchOrgClassesList = async (organisationId?: number | null) => {
    const query = organisationId != null && !isNaN(organisationId) ? `?organisation_id=${organisationId}` : ""
    const API_URL = `${apiBase}/org/classes/list.php${query}`
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
    })
    if (!response.ok) {
      const text = await response.text()
      try {
        const err = JSON.parse(text)
        throw new Error(err.message || err.error || err.msg || `API Error (${response.status})`)
      } catch (e: any) {
        if (e?.message) throw e
        throw new Error(text || `API Error (${response.status})`)
      }
    }
    const data = await response.json()
    if (import.meta.env.DEV) console.log("[org/classes/list] response:", data)
    // API returns { success, organisation_id, principals: [ { principal_id, name, email, classes: ["1A","2A",...] } ] }
    let raw: any[] = []
    if (Array.isArray(data?.principals)) {
      const allClasses = new Set<string>()
      data.principals.forEach((p: any) => {
        const classes = p?.classes
        if (Array.isArray(classes)) classes.forEach((c: any) => { if (c != null && String(c).trim()) allClasses.add(String(c).trim()) })
      })
      raw = Array.from(allClasses)
    }
    if (raw.length === 0 && Array.isArray(data)) raw = data
    else if (raw.length === 0 && Array.isArray(data?.classes)) raw = data.classes
    else if (raw.length === 0 && Array.isArray(data?.data)) raw = data.data
    else if (raw.length === 0 && data?.data && Array.isArray(data.data?.classes)) raw = data.data.classes
    else if (raw.length === 0 && Array.isArray(data?.data?.class_list)) raw = data.data.class_list
    else if (raw.length === 0 && Array.isArray(data?.class_list)) raw = data.class_list
    else if (raw.length === 0 && Array.isArray(data?.list)) raw = data.list
    else if (raw.length === 0 && Array.isArray(data?.result)) raw = data.result
    else if (raw.length === 0 && typeof data?.classes === "string") raw = data.classes.split(",").map((s: string) => s.trim()).filter(Boolean)
    else if (raw.length === 0 && typeof data?.data === "string") raw = data.data.split(",").map((s: string) => s.trim()).filter(Boolean)
    else if (raw.length === 0 && data?.data && typeof data.data === "object" && !Array.isArray(data.data)) {
      const d = data.data as Record<string, unknown>
      const arr = d.classes ?? d.class_list ?? d.list ?? d.data
      if (Array.isArray(arr)) raw = arr
    }
    const list = raw.map((c: any) => {
      if (c == null) return ""
      if (typeof c === "string") return c.trim()
      if (typeof c === "object" && (c.class != null || c.name != null || c.value != null))
        return String(c.class ?? c.name ?? c.value).trim()
      return String(c).trim()
    }).filter(Boolean) as string[]
    return [...new Set(list)].sort()
  }

  // API: org/classes/update.php - add or replace classes for an organisation (Principal and Admin only)
  const updateOrgClasses = async (payload: { classes: string[]; replace: boolean; organisation_id?: number }) => {
    const API_URL = `${apiBase}/org/classes/update.php`
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const text = await response.text()
      try {
        const err = JSON.parse(text)
        throw new Error(err.message || err.error || err.msg || `API Error (${response.status})`)
      } catch (e: any) {
        if (e.message) throw e
        throw new Error(text || `API Error (${response.status})`)
      }
    }
    return response.json()
  }

  const handleClassesUpdateSubmit = async () => {
    const list = classesUpdateList
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (list.length === 0) {
      setClassesUpdateError("Enter at least one class (one per line or comma-separated).")
      return
    }
    setClassesUpdateLoading(true)
    setClassesUpdateError(null)
    try {
      const orgId = isAdministrator() && classesUpdateOrgId ? parseInt(classesUpdateOrgId, 10) : (authData?.user?.organisation_id != null ? Number(authData.user.organisation_id) : null)
      const payload: { classes: string[]; replace: boolean; organisation_id?: number } = {
        classes: list,
        replace: true,
      }
      if (orgId != null && !isNaN(orgId)) payload.organisation_id = orgId
      await updateOrgClasses(payload)
      setShowClassesUpdateDialog(false)
      setClassesUpdateList("")
      setClassesUpdateOrgId("")
      toast.success("Classes updated successfully.", { description: `Updated ${list.length} class(es).`, duration: 3000 })
      loadUsers().catch(() => {})
    } catch (e: any) {
      setClassesUpdateError(e?.message || "Failed to update classes.")
      toast.error("Failed to update classes", { description: e?.message, duration: 4000 })
    } finally {
      setClassesUpdateLoading(false)
    }
  }

  // API function to update user
  const updateUser = async (userData: {
    user_id: number
    first_name: string
    last_name: string
    email: string
    role: string
    organisation_id: number
    class?: string[] | string // Class can be array or string
  }) => {
    const API_URL = `${apiBase}/users/update.php`

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(userData),
      })

      // Parse JSON response first (even if status is not ok)
      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.message || `API Error (${response.status})`
        throw new Error(errorMessage)
      }

      return data
    } catch (error: any) {
      console.error("Error updating user:", error)
      throw error
    }
  }

  // API function to deactivate user (delete)
  const deactivateUser = async (userId: number) => {
    const API_URL = `${apiBase}/users/delete.php`

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      })

      // Get response text first to check if it's valid JSON
      const responseText = await response.text()
      let data
      
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        // If JSON parsing fails, throw with the raw text
        throw new Error(`Invalid API response. Status: ${response.status}. Response: ${responseText}`)
      }

      // Check if API returns success: false (some APIs return 200 but with success: false)
      if (data.success === false || data.error) {
        const errorMessage = data.message || data.error || data.msg || "Failed to deactivate user"
        throw new Error(errorMessage)
      }

      // Check if response status is not ok
      if (!response.ok) {
        // Extract error message from response
        const errorMessage = data.message || data.error || data.msg || `API Error (${response.status})`
        throw new Error(errorMessage)
      }

      return data
    } catch (error: any) {
      console.error("Error deactivating user:", error)
      // If error doesn't have a message, create one
      if (!error.message) {
        throw new Error("Failed to deactivate user. Please try again.")
      }
      throw error
    }
  }

  // API function to activate user (restore)
  const activateUser = async (userId: number) => {
    const API_URL = `${apiBase}/users/restore.php`

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      })

      // Get response text first to check if it's valid JSON
      const responseText = await response.text()
      let data
      
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        // If JSON parsing fails, throw with the raw text
        throw new Error(`Invalid API response. Status: ${response.status}. Response: ${responseText}`)
      }

      // Check if API returns success: false (some APIs return 200 but with success: false)
      if (data.success === false || data.error) {
        const errorMessage = data.message || data.error || data.msg || "Failed to activate user"
        throw new Error(errorMessage)
      }

      // Check if response status is not ok
      if (!response.ok) {
        // Extract error message from response
        const errorMessage = data.message || data.error || data.msg || `API Error (${response.status})`
        throw new Error(errorMessage)
      }

      return data
    } catch (error: any) {
      console.error("Error activating user (restore):", error)
      // If error doesn't have a message, create one
      if (!error.message) {
        throw new Error("Failed to activate user. Please try again.")
      }
      throw error
    }
  }

  // Load organizations from API
  const loadOrganizations = async () => {
    try {
      const response = await fetchOrganizations()
      console.log("Fetched organizations from API:", response)

      // Handle different response formats: data, items, organizations, orgs, or direct array
      let orgsArray: any[] = []
      if (response && response.success === true) {
        if (Array.isArray(response.data)) {
          orgsArray = response.data
        } else if (Array.isArray(response.items)) {
          orgsArray = response.items
        } else if (Array.isArray(response.organizations)) {
          orgsArray = response.organizations
        } else if (Array.isArray(response.orgs)) {
          orgsArray = response.orgs
        } else if (Array.isArray(response)) {
          orgsArray = response
        }
      }

      if (orgsArray.length > 0) {
        const orgs: Organisation[] = orgsArray.map((org: any) => ({
          id: org.id || org.organisation_id || org.organization_id,
          organisation: org.organisation || org.organization || org.name || org.organisation_name || org.organization_name || "Unknown",
        }))
        setOrganizations(orgs)
        setOrganizationsList(["All Organizations", ...orgs.map((o) => o.organisation)])
        console.log("Organizations loaded:", orgs)
      }
    } catch (error) {
      console.error("Error loading organizations:", error)
      // Keep using sample organizations if API fails
    }
  }

  // Load users from API (paginated)
  const loadUsers = async (pageNum?: number) => {
    const currentPage = pageNum ?? page
    try {
      setIsLoading(true)
      setError(null)
      // For admin with org filter: resolve organisation_id from filter name
      let organisationId: number | null = null
      if (!isTeacherOrPrincipal() && filterOrganization !== "all") {
        const org = organizations.find((o) => o.organisation === filterOrganization)
        if (org?.id) organisationId = Number(org.id)
      }
      const response = await fetchUsers({
        page: currentPage,
        per_page: perPage,
        search: searchInput.trim() || undefined,
        role: null,
        is_active: null,
        organisation_id: organisationId,
      })
      if (response && response.success === true && Array.isArray(response.data)) {
        const pag = response.pagination
        if (pag) {
          setPage(pag.page ?? currentPage)
          setTotal(pag.total ?? 0)
          setTotalPages(Math.max(1, pag.total_pages ?? 1))
          if (pag.per_page) setPerPage(pag.per_page)
        }
        const allClasses = new Set<string>()
        response.data.forEach((user: any) => {
          const userClasses = user.class || []
          if (Array.isArray(userClasses)) {
            userClasses.forEach((className: any) => {
              if (className && String(className).trim()) allClasses.add(String(className).trim())
            })
          } else if (userClasses && String(userClasses).trim()) allClasses.add(String(userClasses).trim())
        })
        setAvailableClasses(Array.from(allClasses).sort())
        const fetchedUsers: User[] = response.data.map((user: any) => {
          // Find organization name from organisations list
          // Handle ID matching - convert both to numbers for comparison
          const userOrgId = user.organisation_id || user.organization_id
          const org = organizations.find((o) => {
            // Try multiple ID fields and compare as numbers or strings
            const orgId1 = o.id ? Number(o.id) : null
            const userOrgIdNum = userOrgId ? Number(userOrgId) : null
            return orgId1 === userOrgIdNum
          })
          const orgName = org?.organisation || (userOrgId ? `Org ID: ${userOrgId}` : "Unknown")
          console.log(`User ${user.id || user.user_id} - org_id: ${userOrgId}, found org:`, org?.organisation || "Not found")

          // Debug: Log the raw is_active value from API
          console.log(`User ${user.id || user.user_id} - Full user object from API:`, JSON.stringify(user, null, 2))

          // Handle is_active: Check multiple possible field names and formats
          // Common field names: is_active, isActive, active, status, deleted_at
          let isActiveValue = true // Default to ACTIVE if field is missing (most users are active)
          let isActiveField: any = null
          let fieldName: string | null = null
          
          // Check for is_active field (primary field)
          if (user.is_active !== undefined && user.is_active !== null) {
            isActiveField = user.is_active
            fieldName = "is_active"
          }
          // Check for isActive field (camelCase)
          else if ((user as any).isActive !== undefined && (user as any).isActive !== null) {
            isActiveField = (user as any).isActive
            fieldName = "isActive"
          }
          // Check for active field
          else if ((user as any).active !== undefined && (user as any).active !== null) {
            isActiveField = (user as any).active
            fieldName = "active"
          }
          // Check for status field
          else if ((user as any).status !== undefined && (user as any).status !== null) {
            isActiveField = (user as any).status
            fieldName = "status"
          }
          // Check for deleted_at - if null/undefined, user is active; if set, user is deleted/inactive
          else if ((user as any).deleted_at !== undefined) {
            isActiveField = (user as any).deleted_at === null || (user as any).deleted_at === undefined || (user as any).deleted_at === ""
            fieldName = "deleted_at"
          }
          
          // Parse the value to determine active status
          if (isActiveField !== null && isActiveField !== undefined) {
            // Numeric values: typically 1 = active, 0 = inactive
            // But some APIs use reverse: 1 = deleted/inactive, 0 = active
            if (typeof isActiveField === "number") {
              // Standard: 1 = active, 0 = inactive
              isActiveValue = isActiveField === 1
            }
            // String numeric values
            else if (typeof isActiveField === "string") {
              const lowerStr = isActiveField.toLowerCase().trim()
              if (lowerStr === "1" || lowerStr === "true" || lowerStr === "active" || lowerStr === "enabled" || lowerStr === "yes") {
                isActiveValue = true
              } else if (lowerStr === "0" || lowerStr === "false" || lowerStr === "inactive" || lowerStr === "disabled" || lowerStr === "deleted" || lowerStr === "no") {
                isActiveValue = false
              } else {
                // For deleted_at field, empty/null means active
                if (fieldName === "deleted_at") {
                  isActiveValue = lowerStr === "" || lowerStr === "null"
                } else {
                  // Unknown string value - default to active (safer)
                  console.warn(`Unknown string value for ${fieldName || "status"} field: "${isActiveField}" - defaulting to ACTIVE`)
                  isActiveValue = true
                }
              }
            }
            // Boolean values
            else if (typeof isActiveField === "boolean") {
              isActiveValue = isActiveField
            }
          } else {
            // Field is missing or null
            // Check deleted_at field as fallback - if deleted_at is set, user is inactive
            const deletedAt = (user as any).deleted_at
            if (deletedAt !== undefined && deletedAt !== null && deletedAt !== "") {
              isActiveValue = false
              fieldName = "deleted_at"
              isActiveField = deletedAt
            } else {
              // No status field found - default to ACTIVE (users are active by default unless deleted)
              isActiveValue = true
            }
          }
          
          // Double-check: If deleted_at exists and is set, user should be inactive regardless of is_active
          const deletedAt = (user as any).deleted_at
          if (deletedAt !== undefined && deletedAt !== null && deletedAt !== "" && typeof deletedAt === "string" && deletedAt.trim() !== "") {
            isActiveValue = false
            if (fieldName !== "deleted_at") {
              fieldName = "deleted_at (override)"
            }
          }
          
          console.log(`User ${user.id || user.user_id} (${user.first_name || ""} ${user.last_name || ""}):`)
          console.log(`  - Field used: ${fieldName || "none (defaulted)"}`)
          console.log(`  - Raw value: ${isActiveField} (type: ${typeof isActiveField})`)
          console.log(`  - Parsed as: ${isActiveValue ? "ACTIVE" : "INACTIVE"}`)

          // Parse classes from API - user.class is an array like ["10-A", "9-B"]
          const userClasses = user.class || []
          let classesDisplay = "None"
          if (Array.isArray(userClasses) && userClasses.length > 0) {
            classesDisplay = userClasses.join(", ") // Join array into comma-separated string for display
          } else if (userClasses && String(userClasses).trim()) {
            classesDisplay = String(userClasses).trim()
          }
          
          return {
            id: user.id?.toString() || user.user_id?.toString() || Date.now().toString(),
            user_id: user.user_id || user.id ? parseInt(user.user_id?.toString() || user.id?.toString() || "0") : undefined,
            name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
            email: user.email || "",
            role: mapApiRoleToUIRole(user.role || "student"),
            classes: classesDisplay,
            organization: orgName,
            organisation_id: user.organisation_id,
            // Handle is_active: 1 = active, 0 = inactive, null/undefined = inactive
            // Also handle string values "1" and "0"
            isActive: isActiveValue,
          }
        })

        setUsers(fetchedUsers)
      } else {
        setUsers([])
        if (response && response.pagination) {
          const pag = response.pagination
          setTotal(pag.total ?? 0)
          setTotalPages(Math.max(1, pag.total_pages ?? 1))
        }
      }
    } catch (error: any) {
      console.error("Error loading users:", error)
      setError(error?.message || "Failed to load users")
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrganizations()
  }, [])

  useEffect(() => {
    setPage(1)
    loadUsers(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOrganization, searchInput])

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage])

  // Update default role based on allowed roles when modal opens (only for new users)
  useEffect(() => {
    if (showAddUserModal && !editingUser) {
      const allowedRoles = getAllowedRoles()
      if (allowedRoles.length > 0) {
        const currentRoleIsAllowed = allowedRoles.includes(formData.role as AssignableRole)
        if (!currentRoleIsAllowed) {
          setFormData((prev) => ({ ...prev, role: allowedRoles[0] as User["role"] }))
        }
      }
    }
  }, [showAddUserModal, editingUser])

  // Current page users (API returns filtered by organisation_id when admin selects an org)
  const filteredUsers = users

  // Sort current page (client-side)
  const sortedUsers = React.useMemo(() => {
    if (!sortBy) return [...filteredUsers]
    const key = sortBy as keyof User
    return [...filteredUsers].sort((a, b) => {
      let aVal: any = a[key]
      let bVal: any = b[key]
      if (key === "classes" || key === "organization") {
        aVal = String(aVal ?? "")
        bVal = String(bVal ?? "")
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      if (key === "name" || key === "email" || key === "role") {
        aVal = String(aVal ?? "")
        bVal = String(bVal ?? "")
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      if (key === "isActive") {
        aVal = aVal ? 1 : 0
        bVal = bVal ? 1 : 0
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal
      }
      aVal = String(aVal ?? "")
      bVal = String(bVal ?? "")
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })
  }, [filteredUsers, sortBy, sortOrder])

  const handleSort = (column: keyof User) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  // Handle checkbox selection
  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)))
    }
  }

  // Handle add user
  const handleAddUser = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.organisation_id) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields including Organisation",
        duration: 4000,
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Convert class string to array format for API (API expects array like ["10-A"])
      const classArray = formData.classes && formData.classes.trim() 
        ? [formData.classes.trim()] 
        : undefined
      
      const userData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        role: mapUIRoleToApiRole(formData.role),
        organisation_id: parseInt(formData.organisation_id),
        class: classArray, // API expects class as array
      }

      const response = await createUser(userData)
      console.log("Create User API Response:", response)

      if (response.success === true) {
        if (formData.classes && formData.classes.trim()) {
          const newClass = formData.classes.trim()
          if (!availableClasses.includes(newClass)) {
            setAvailableClasses([...availableClasses, newClass].sort())
          }
        }
        await loadUsers()
        resetForm()
        setShowAddUserModal(false)
        setShowAddUserForm(false)
        toast.success("User created successfully!", {
          description: `"${formData.firstName} ${formData.lastName}" has been added.`,
          duration: 3000,
        })
      } else {
        throw new Error(response.message || "Failed to create user")
      }
    } catch (error: any) {
      console.error("Error creating user:", error)
      const userFriendlyError = parseErrorMessage(error)
      setError(userFriendlyError)
      toast.error("Failed to create user", {
        description: userFriendlyError,
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle edit user
  const handleEditUser = (user: User) => {
    const nameParts = user.name.split(" ")
    const classesValue = user.classes && user.classes !== "None" && typeof user.classes === "string"
      ? user.classes.split(",")[0].trim()
      : (user.classes && typeof user.classes === "number" ? String(user.classes) : "")
    
    const allowedRoles = getAllowedRoles()
    let roleToSet = user.role
    if (!allowedRoles.includes(user.role as AssignableRole)) {
      roleToSet = allowedRoles[0] as User["role"]
    }
    
    setFormData({
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: user.email,
      role: roleToSet,
      classes: classesValue,
      organization: user.organization,
      organisation_id: user.organisation_id?.toString() || "",
    })
    setClassInputValue(classesValue)
    setEditingUser(user)
    setShowAddUserModal(true)
  }

  // Handle update user
  const handleUpdateUser = async () => {
    if (!editingUser || !formData.firstName || !formData.lastName || !formData.email || !formData.organisation_id) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields including Organisation",
        duration: 4000,
      })
      return
    }

    const userId = parseInt(editingUser.id)
    if (isNaN(userId) || userId <= 0) {
      toast.error("Invalid User ID", {
        description: "Please refresh the page and try again.",
        duration: 4000,
      })
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      // Convert class string to array format for API (API expects array like ["10-A"])
      const classArray = formData.classes && formData.classes.trim() 
        ? [formData.classes.trim()] 
        : undefined
      
      const userData = {
        user_id: userId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        role: mapUIRoleToApiRole(formData.role),
        organisation_id: parseInt(formData.organisation_id),
        class: classArray, // API expects class as array
      }

      console.log("Updating user with data:", userData)
      const response = await updateUser(userData)
      console.log("Update User API Response:", response)

      if (response.success === true) {
        if (formData.classes && formData.classes.trim()) {
          const newClass = formData.classes.trim()
          if (!availableClasses.includes(newClass)) {
            setAvailableClasses([...availableClasses, newClass].sort())
          }
        }
        await loadUsers()
        resetForm()
        setEditingUser(null)
        setShowAddUserModal(false)
        toast.success("User updated successfully!", {
          description: `"${formData.firstName} ${formData.lastName}" has been updated.`,
          duration: 3000,
        })
      } else {
        throw new Error(response.message || "Failed to update user")
      }
    } catch (error: any) {
      console.error("Error updating user:", error)
      const userFriendlyError = parseErrorMessage(error)
      setError(userFriendlyError)
      toast.error("Failed to update user", {
        description: userFriendlyError,
        duration: 5000,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle toggle user status (activate/deactivate)
  const handleToggleStatus = (user: User) => {
    setUserToToggle(user)
    setShowStatusDialog(true)
  }

  const confirmToggleStatus = async () => {
    if (!userToToggle) return

    // Use user_id if available (from API), otherwise parse from id
    const userId = userToToggle.user_id || parseInt(userToToggle.id)
    if (isNaN(userId) || userId <= 0) {
      toast.error("Invalid User ID", {
        description: "Please refresh the page and try again.",
        duration: 4000,
      })
      return
    }

    // Explicitly check if isActive is true (not defaulting to true)
    // If isActive is undefined/null, treat as inactive
    const currentStatus = userToToggle.isActive === true
    const newStatus = !currentStatus

    // Debug logging
    console.log(`Toggle Status Debug:`)
    console.log(`  User ID: ${userId}`)
    console.log(`  User Name: ${userToToggle.name}`)
    console.log(`  Current isActive value: ${userToToggle.isActive}`)
    console.log(`  Current Status (isActive === true): ${currentStatus}`)
    console.log(`  Action: ${currentStatus ? "DEACTIVATE" : "ACTIVATE"}`)

    try {
      const action = currentStatus ? "deactivate" : "activate"
      
      // Update the user's status in local state immediately (optimistic update)
      // This ensures deactivated users remain visible even if API filters them out
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userToToggle.id 
          ? { ...user, isActive: !currentStatus }
          : user
      ))
      
      // Call the appropriate API based on current status
      if (currentStatus) {
        // Currently active, so deactivate (delete)
        console.log(`Deactivating user ${userId}...`)
        const response = await deactivateUser(userId)
        console.log("Deactivate User API Response:", response)
      } else {
        // Currently inactive, so activate (restore)
        console.log(`Activating user ${userId}...`)
        const response = await activateUser(userId)
        console.log("Activate User API Response:", response)
      }

      // Refresh users from API (API might not return deactivated users, so we merge)
      // The loadUsers function now preserves deactivated users that aren't in the API response
      try {
        await loadUsers()
      } catch (error) {
        // If loadUsers fails, we still have the optimistic update above
        console.error("Error refreshing users after status change:", error)
      }

      setUserToToggle(null)
      setShowStatusDialog(false)

      toast.success(currentStatus ? "User deactivated" : "User activated", {
        description: `"${userToToggle.name}" has been ${currentStatus ? "deactivated" : "activated"} successfully!`,
        duration: 3000,
      })
    } catch (error: any) {
      console.error("Error toggling user status:", error)
      const action = currentStatus ? "deactivate" : "activate"
      let errorMessage = error.message || `Failed to ${action} user. Please try again.`
      
      // Normalize error message to lowercase for checking
      const errorLower = errorMessage.toLowerCase()
      
      // Handle specific error cases with better, user-friendly messages based on the action
      const userFriendlyError = parseErrorMessage(error)
      if (errorLower.includes("already active")) {
        if (!currentStatus) {
          errorMessage = "This user is already active. The status displayed may be incorrect. Refreshing the user list."
        } else {
          errorMessage = "This user is already active. This may indicate a data synchronization issue. Refreshing the user list."
        }
        await loadUsers()
        toast.warning("Status Update", { description: errorMessage, duration: 5000 })
      } else if (errorLower.includes("already inactive") || errorLower.includes("already deactivated") || errorLower.includes("already deleted")) {
        errorMessage = `This user is already ${!currentStatus ? "deactivated" : "deactivated"}. Refreshing the user list.`
        await loadUsers()
        toast.warning("Status Update", { description: errorMessage, duration: 5000 })
      } else if (errorLower.includes("not found") || errorLower.includes("does not exist") || errorLower.includes("invalid user")) {
        errorMessage = "User not found. The user may have been deleted. Refreshing the user list."
        await loadUsers()
        toast.error("User Not Found", { description: errorMessage, duration: 5000 })
      } else if (errorLower.includes("permission") || errorLower.includes("unauthorized") || errorLower.includes("forbidden")) {
        errorMessage = "You do not have permission to perform this action. Please contact your administrator."
        toast.error("Permission Denied", { description: errorMessage, duration: 5000 })
      } else if (errorLower.includes("network") || errorLower.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection and try again."
        toast.error("Network Error", { description: errorMessage, duration: 5000 })
      } else {
        toast.error(`Failed to ${action} user`, { description: userFriendlyError, duration: 5000 })
        await loadUsers()
      }
      
      // Close dialog and reset state
      setUserToToggle(null)
      setShowStatusDialog(false)
    }
  }

  // Handle bulk delete (deactivate)
  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) {
      toast.error("No Users Selected", {
        description: "Please select users to deactivate",
        duration: 4000,
      })
      return
    }

    const selectedCount = selectedUsers.size
    if (!confirm(`Are you sure you want to deactivate ${selectedCount} user(s)?`)) {
      return
    }

    try {
      const deactivatePromises = Array.from(selectedUsers).map(async (userId) => {
        const user = users.find((u) => u.id === userId)
        if (user && user.isActive === true) {
          const userIdNum = user.user_id || parseInt(userId)
          if (!isNaN(userIdNum) && userIdNum > 0) {
            await deactivateUser(userIdNum)
          }
        }
      })

      await Promise.all(deactivatePromises)
      await loadUsers()
      setSelectedUsers(new Set())
      toast.success("Users Deactivated", {
        description: `${selectedCount} user(s) deactivated successfully!`,
        duration: 3000,
      })
    } catch (error: any) {
      console.error("Error bulk deactivating users:", error)
      const userFriendlyError = parseErrorMessage(error)
      toast.error("Failed to Deactivate Users", {
        description: userFriendlyError,
        duration: 5000,
      })
      await loadUsers()
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      role: "Student",
      classes: "",
      organization: "",
      organisation_id: "",
    })
    setClassInputValue("")
    setShowClassDropdown(false)
    setEditingUser(null)
    setError(null)
  }

  const openAddUserModal = () => {
    resetForm()
    setShowAddUserModal(true)
  }

  return (
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .class-sidebar {
              position: fixed !important;
              left: ${sidebarCollapsed ? "-280px" : "0"} !important;
              z-index: 1000 !important;
              height: 100vh !important;
              overflow-y: auto !important;
            }
            .class-main-content {
              margin-left: 0 !important;
              width: 100% !important;
            }
            .class-overlay {
              display: ${sidebarCollapsed ? "none" : "block"} !important;
            }
          }
          @media (max-width: 640px) {
            .class-card {
              padding: 16px !important;
            }
            .class-title {
              font-size: 18px !important;
            }
            .class-button-group {
              flex-direction: column !important;
              width: 100% !important;
            }
            .class-button-group button {
              width: 100% !important;
            }
            .class-table-container {
              overflow-x: auto !important;
            }
            .class-table {
              min-width: 600px !important;
            }
          }
        `}
      </style>
      <div
        className="class-overlay"
        onClick={() => setSidebarCollapsed(true)}
        style={{
          display: isMobile && !sidebarCollapsed ? "block" : "none",
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 999,
        }}
      />
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#1E40AF" }}>
      {/* Sidebar */}
      <div
        className="class-sidebar"
        style={{
          width: sidebarCollapsed ? "80px" : "280px",
          backgroundColor: "#1E3A8A",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease, left 0.3s ease",
          position: isMobile ? "fixed" : "fixed",
          top: 0,
          left: isMobile ? (sidebarCollapsed ? "-280px" : "0") : "0",
          zIndex: 100,
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: "24px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {!sidebarCollapsed && (
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#FFFFFF",
                cursor: "pointer",
              }}
              onClick={() => navigate("/skills-home")}
            >
              ENGLISH SKILL AI
            </h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: "transparent",
              border: "none",
              color: "#FFFFFF",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft
              style={{
                width: "20px",
                height: "20px",
                transform: sidebarCollapsed ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s",
              }}
            />
          </button>
        </div>

        {/* Navigation Menu */}
        <div
          style={{
            flex: 1,
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            overflowY: "auto",
          }}
        >
          {menuItems.filter((item) => {
            const userRole = (authData?.user?.role || "").toLowerCase()
            if (item.id === "license-management") {
              return userRole === "administrator" || userRole.includes("admin")
            }
            if (item.id === "class-management") {
              return userRole === "principal" || userRole.includes("principal") ||
                userRole === "teacher" || userRole.includes("teacher") ||
                userRole === "administrator" || userRole.includes("admin")
            }
            return true
          }).map((item) => {
            const Icon = item.icon
            const isActive = item.active || window.location.pathname === item.route
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.route && item.route !== "#") {
                    navigate(item.route)
                  }
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  backgroundColor: isActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "14px",
                  fontWeight: isActive ? "600" : "400",
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }
                }}
              >
                <Icon style={{ width: "20px", height: "20px", flexShrink: 0 }} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </div>

        {/* User Profile Section */}
        <div
          style={{
            padding: "20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: sidebarCollapsed ? "0" : "8px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#3B82F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontWeight: "bold",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              {getInitials(
                `${authData?.user?.first_name || ""} ${authData?.user?.last_name || ""}`.trim() ||
                  "User"
              )}
            </div>
            {!sidebarCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#FFFFFF",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {authData?.user?.first_name || "User"} {authData?.user?.last_name || ""}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(255, 255, 255, 0.7)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {authData?.user?.email || ""}
                </p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={logout}
              style={{
                width: "100%",
                padding: "12px 16px",
                backgroundColor: "#DC2626",
                border: "none",
                borderRadius: "8px",
                color: "#FFFFFF",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#B91C1C"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#DC2626"
              }}
            >
              <LogOut style={{ width: "16px", height: "16px" }} />
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div
        className="class-main-content"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          marginLeft: sidebarCollapsed ? "80px" : "280px",
          transition: "margin-left 0.3s ease",
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            padding: "24px 32px",
            borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {isMobile && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#1E3A8A",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Menu style={{ width: "24px", height: "24px" }} />
            </button>
          )}
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#1E3A8A",
              margin: 0,
            }}
          >
            Class Management
          </h1>
          <div
            className="class-button-group"
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Button
              onClick={openAddUserModal}
              style={{
                backgroundColor: "#3B82F6",
                color: "#FFFFFF",
              }}
            >
              <UserPlus style={{ width: "16px", height: "16px", marginRight: "8px" }} />
              Add User
            </Button>
            <Button
              onClick={() => setShowUploadCSVDialog(true)}
              variant="outline"
              style={{
                borderColor: "#3B82F6",
                color: "#3B82F6",
              }}
            >
              <Upload style={{ width: "16px", height: "16px", marginRight: "8px" }} />
              Upload CSV
            </Button>
            {(isAdministrator() || isPrincipal()) && (
            <>
            <Button
              onClick={() => {
                setShowAssignClassDialog(true)
                if (isPrincipal() && authData?.user?.organisation_id != null) {
                  const org = organizations.find((o) => o.id === authData?.user?.organisation_id || o.id === Number(authData?.user?.organisation_id))
                  if (org) setAssignClassForm((prev) => ({ ...prev, filterOrganization: org.organisation }))
                } else if (isAdministrator()) {
                  setAssignClassForm((prev) => ({ ...prev, filterOrganization: prev.filterOrganization || "all" }))
                }
              }}
              variant="outline"
              style={{
                borderColor: "#3B82F6",
                color: "#3B82F6",
              }}
            >
              <Users style={{ width: "16px", height: "16px", marginRight: "8px" }} />
              Assign Class
            </Button>
            <Button
              onClick={() => {
                setShowClassesUpdateDialog(true)
                setClassesUpdateError(null)
                setClassesUpdateList("")
                if (isAdministrator() && organizations.length > 0) setClassesUpdateOrgId(organizations[0]?.id?.toString() ?? "")
                else setClassesUpdateOrgId("")
              }}
              variant="outline"
              style={{
                borderColor: "#3B82F6",
                color: "#3B82F6",
              }}
            >
              <List style={{ width: "16px", height: "16px", marginRight: "8px" }} />
              Add/Update Classes
            </Button>
            </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ padding: "32px", flex: 1, backgroundColor: "#1E40AF" }}>
          {/* Existing Users Section */}
          <div
            className="class-card"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <h2
                className="class-title"
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1E3A8A",
                  margin: 0,
                  marginBottom: "8px",
                }}
              >
                Existing Users
              </h2>
              <p style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)", margin: 0 }}>
                List of all users in the organization
              </p>
            </div>

            {/* Filter Section - hidden for Teacher and Principal */}
            {!isTeacherOrPrincipal() && (
            <div style={{ marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#1E3A8A", marginBottom: "8px" }}>
                  Filter by Organization:
                </label>
                <div data-dropdown style={{ position: "relative", width: "100%", maxWidth: "300px" }}>
                  <button
                    type="button"
                    onClick={() => setIsFilterOrgDropdownOpen(!isFilterOrgDropdownOpen)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(30, 58, 138, 0.2)",
                      fontSize: "14px",
                      color: "#1E3A8A",
                      backgroundColor: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <span>{filterOrganization === "all" ? "All Organizations" : filterOrganization}</span>
                    <ChevronDown style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                  </button>
                  {isFilterOrgDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid rgba(30, 58, 138, 0.2)",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        maxHeight: "200px",
                        overflow: "auto",
                        zIndex: 50,
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Search organizations..."
                        value={filterOrgSearchTerm}
                        onChange={(e) => setFilterOrgSearchTerm(e.target.value)}
                        onFocus={(e) => e.stopPropagation()}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "none",
                          borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
                          fontSize: "14px",
                          outline: "none",
                        }}
                      />
                      {organizationsList
                        .filter((org) =>
                          (org === "All Organizations" ? "all" : org).toLowerCase().includes(filterOrgSearchTerm.toLowerCase())
                        )
                        .map((org) => (
                          <button
                            key={org}
                            type="button"
                            onClick={() => {
                              setFilterOrganization(org === "All Organizations" ? "all" : org)
                              setIsFilterOrgDropdownOpen(false)
                              setFilterOrgSearchTerm("")
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              textAlign: "left",
                              border: "none",
                              background: filterOrganization === (org === "All Organizations" ? "all" : org) ? "rgba(59, 130, 246, 0.1)" : "transparent",
                              cursor: "pointer",
                              fontSize: "14px",
                              color: "#1E3A8A",
                            }}
                          >
                            {org}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#1E3A8A", marginBottom: "8px" }}>
                  Search:
                </label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(30, 58, 138, 0.2)",
                    fontSize: "14px",
                    color: "#1E3A8A",
                    minWidth: "200px",
                  }}
                />
              </div>
            </div>
            )}

            {/* Search for Teacher/Principal (no org filter) */}
            {isTeacherOrPrincipal() && (
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#1E3A8A", marginBottom: "8px" }}>Search:</label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(30, 58, 138, 0.2)",
                  fontSize: "14px",
                  color: "#1E3A8A",
                  maxWidth: "300px",
                  width: "100%",
                }}
              />
            </div>
            )}

            {/* Bulk Actions */}
            {selectedUsers.size > 0 && (
              <div
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#EFF6FF",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "14px", color: "#1E3A8A", fontWeight: "500" }}>
                  {selectedUsers.size} user{selectedUsers.size > 1 ? "s" : ""} selected
                </span>
                <Button
                  onClick={handleBulkDelete}
                  variant="outline"
                  style={{
                    borderColor: "#DC2626",
                    color: "#DC2626",
                  }}
                >
                  Deactivate Selected
                </Button>
              </div>
            )}

            {error && (
              <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#FEE2E2", borderRadius: "8px", color: "#DC2626", fontSize: "14px" }}>
                {error}
              </div>
            )}

            {/* Users Table */}
            <div className="class-table-container" style={{ overflowX: "auto" }}>
              <table
                className="class-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "800px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid rgba(30, 58, 138, 0.1)",
                      backgroundColor: "#F3F4F6",
                    }}
                  >
                    <th style={{ padding: "12px", textAlign: "left", width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === sortedUsers.length && sortedUsers.length > 0}
                        onChange={handleSelectAll}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                    </th>
                    {[
                      { key: "name" as const, label: "NAME" },
                      { key: "email" as const, label: "EMAIL" },
                      { key: "role" as const, label: "ROLE" },
                      { key: "classes" as const, label: "CLASSES" },
                      { key: "organization" as const, label: "ORGANIZATION" },
                      { key: "isActive" as const, label: "STATUS" },
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        style={{
                          padding: "12px",
                          textAlign: key === "organization" || key === "isActive" ? "left" : "left",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#1E3A8A",
                          cursor: "pointer",
                          userSelect: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          {label}
                          {sortBy === key && (sortOrder === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                        </span>
                      </th>
                    ))}
                    <th style={{ padding: "12px", textAlign: "center", fontSize: "14px", fontWeight: "600", color: "#1E3A8A" }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)" }}>
                        Loading...
                      </td>
                    </tr>
                  ) : sortedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)" }}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    sortedUsers.map((user) => {
                      // Explicitly check if isActive is true (not defaulting to true)
                      // If isActive is undefined/null/false, treat as inactive/deactivated
                      const isActive = user.isActive === true
                      const statusColor = isActive ? "#059669" : "#DC2626" // Green for Active, Red for Deactivated
                      const statusText = isActive ? "Active" : "Deactivated" // Show "Deactivated" for deactivated users
                      const buttonColor = isActive ? "#DC2626" : "#059669" // Red for Deactivate, Green for Activate
                      const buttonText = isActive ? "Deactivate" : "Activate"

                      return (
                        <tr
                          key={user.id}
                          style={{
                            borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
                            backgroundColor: selectedUsers.has(user.id) ? "#EFF6FF" : "#FFFFFF",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedUsers.has(user.id)) {
                              e.currentTarget.style.backgroundColor = "#F3F4F6"
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedUsers.has(user.id)) {
                              e.currentTarget.style.backgroundColor = "#FFFFFF"
                            }
                          }}
                        >
                          <td style={{ padding: "12px" }}>
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                              style={{
                                width: "18px",
                                height: "18px",
                                cursor: "pointer",
                              }}
                            />
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A", fontWeight: "500" }}>
                            {user.name}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {user.email}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {user.role}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {user.classes}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {user.organization}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 12px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                backgroundColor: isActive ? "#D1FAE5" : "#FEE2E2",
                                color: statusColor,
                                border: `1px solid ${statusColor}`,
                              }}
                            >
                              {statusText}
                            </span>
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                style={{
                                  padding: "6px",
                                  color: "#3B82F6",
                                }}
                              >
                                <Edit style={{ width: "16px", height: "16px" }} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleStatus(user)}
                                style={{
                                  borderColor: buttonColor,
                                  color: buttonColor,
                                  fontSize: "12px",
                                  padding: "6px 12px",
                                }}
                                title={buttonText}
                              >
                                {buttonText}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.8)" }}>
                Showing {total === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total} users
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ borderColor: "#1E3A8A", color: "#1E3A8A" }}
                >
                  <ChevronLeft style={{ width: "16px", height: "16px" }} />
                  Previous
                </Button>
                <span style={{ fontSize: "14px", color: "#1E3A8A", fontWeight: "500", minWidth: "80px", textAlign: "center" }}>
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{ borderColor: "#1E3A8A", color: "#1E3A8A" }}
                >
                  Next
                  <ChevronRight style={{ width: "16px", height: "16px" }} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent
          style={{
            maxWidth: "600px",
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontSize: "20px", fontWeight: "bold", color: "#1E3A8A" }}>
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)" }}>
              {editingUser ? "Update user information" : "Fill in the details to add a new user"}
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#1E3A8A",
                    marginBottom: "8px",
                  }}
                >
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(30, 58, 138, 0.2)",
                    fontSize: "14px",
                    color: "#1E3A8A",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#1E3A8A",
                    marginBottom: "8px",
                  }}
                >
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(30, 58, 138, 0.2)",
                    fontSize: "14px",
                    color: "#1E3A8A",
                  }}
                />
              </div>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#1E3A8A",
                  marginBottom: "8px",
                }}
              >
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(30, 58, 138, 0.2)",
                  fontSize: "14px",
                  color: "#1E3A8A",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#1E3A8A",
                  marginBottom: "8px",
                }}
              >
                Role *
              </label>
              <div data-dropdown style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(30, 58, 138, 0.2)",
                    fontSize: "14px",
                    color: "#1E3A8A",
                    backgroundColor: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <span>{formData.role}</span>
                  <ChevronDown style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                </button>
                {isRoleDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "4px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(30, 58, 138, 0.2)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      maxHeight: "200px",
                      overflow: "auto",
                      zIndex: 50,
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Search roles..."
                      value={roleSearchTerm}
                      onChange={(e) => setRoleSearchTerm(e.target.value)}
                      onFocus={(e) => e.stopPropagation()}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                    {getAllowedRoles()
                      .filter((r) => r.toLowerCase().includes(roleSearchTerm.toLowerCase()))
                      .map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, role: role as User["role"] })
                            setIsRoleDropdownOpen(false)
                            setRoleSearchTerm("")
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            textAlign: "left",
                            border: "none",
                            background: formData.role === role ? "rgba(59, 130, 246, 0.1)" : "transparent",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#1E3A8A",
                          }}
                        >
                          {role}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#1E3A8A",
                  marginBottom: "8px",
                }}
              >
                Classes
              </label>
              <div data-dropdown style={{ position: "relative" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid rgba(30, 58, 138, 0.2)",
                    borderRadius: "8px",
                    backgroundColor: "#FFFFFF",
                    overflow: "hidden",
                  }}
                >
                  <input
                    type="text"
                    value={showClassDropdown ? classInputValue : formData.classes || classInputValue}
                    onChange={(e) => {
                      setClassInputValue(e.target.value)
                      setShowClassDropdown(true)
                      const list = getClassesForDropdown()
                      if (list.includes(e.target.value)) {
                        setFormData({ ...formData, classes: e.target.value })
                      } else {
                        setFormData({ ...formData, classes: e.target.value })
                      }
                    }}
                    onFocus={() => {
                      setShowClassDropdown(true)
                      loadOrgClassesForDropdown()
                    }}
                    placeholder={isTeacher() ? "Select a class" : "Select or type to create new class"}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      border: "none",
                      fontSize: "14px",
                      color: "#1E3A8A",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowClassDropdown(!showClassDropdown)
                      if (!showClassDropdown) loadOrgClassesForDropdown()
                    }}
                    style={{
                      padding: "8px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#1E3A8A",
                    }}
                  >
                    <ChevronDown style={{ width: "16px", height: "16px" }} />
                  </button>
                </div>
                {showClassDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "4px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(30, 58, 138, 0.2)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      maxHeight: "200px",
                      overflow: "auto",
                      zIndex: 50,
                    }}
                  >
                    {orgClassesListLoading && (
                      <div style={{ padding: "10px 12px", fontSize: "14px", color: "rgba(30, 58, 138, 0.7)" }}>
                        Loading classes…
                      </div>
                    )}
                    {!(isTeacher()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, classes: classInputValue || "New Class" })
                        setClassInputValue(classInputValue || "New Class")
                        setShowClassDropdown(false)
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#3B82F6",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Plus style={{ width: "16px", height: "16px" }} />
                      Create new class "{classInputValue || "New Class"}"
                    </button>
                    )}
                    {getClassesForDropdown()
                      .filter((c) => c.toLowerCase().includes(classInputValue.toLowerCase()))
                      .map((className) => (
                        <button
                          key={className}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, classes: className })
                            setClassInputValue(className)
                            setShowClassDropdown(false)
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            textAlign: "left",
                            border: "none",
                            background: formData.classes === className ? "rgba(59, 130, 246, 0.1)" : "transparent",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#1E3A8A",
                          }}
                        >
                          {className}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#1E3A8A",
                  marginBottom: "8px",
                }}
              >
                Organization *
              </label>
              <div data-dropdown style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(30, 58, 138, 0.2)",
                    fontSize: "14px",
                    color: "#1E3A8A",
                    backgroundColor: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <span>{formData.organization || "Select Organization"}</span>
                  <ChevronDown style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                </button>
                {isOrgDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "4px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(30, 58, 138, 0.2)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      maxHeight: "200px",
                      overflow: "auto",
                      zIndex: 50,
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Search organizations..."
                      value={orgSearchTerm}
                      onChange={(e) => setOrgSearchTerm(e.target.value)}
                      onFocus={(e) => e.stopPropagation()}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                    {organizations
                      .filter((org) =>
                        org.organisation.toLowerCase().includes(orgSearchTerm.toLowerCase())
                      )
                      .map((org) => (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              organisation_id: org.id.toString(),
                              organization: org.organisation,
                            })
                            setIsOrgDropdownOpen(false)
                            setOrgSearchTerm("")
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            textAlign: "left",
                            border: "none",
                            background: formData.organisation_id === org.id.toString() ? "rgba(59, 130, 246, 0.1)" : "transparent",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#1E3A8A",
                          }}
                        >
                          {org.organisation}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            {error && (
              <p style={{ color: "#DC2626", fontSize: "14px", margin: 0 }}>
                {error}
              </p>
            )}
          </div>
          <DialogFooter style={{ marginTop: "24px" }}>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddUserModal(false)
                resetForm()
              }}
              style={{
                borderColor: "#1E3A8A",
                color: "#1E3A8A",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingUser ? handleUpdateUser : handleAddUser}
              disabled={isLoading || isUpdating}
              style={{
                backgroundColor: isLoading || isUpdating ? "#9CA3AF" : "#3B82F6",
                color: "#FFFFFF",
                cursor: isLoading || isUpdating ? "not-allowed" : "pointer",
              }}
            >
              {isLoading || isUpdating
                ? editingUser
                  ? "Updating..."
                  : "Creating..."
                : editingUser
                ? "Update User"
                : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Toggle Confirmation Dialog */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent style={{ backgroundColor: "#FFFFFF", borderRadius: "16px" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontSize: "20px", fontWeight: "bold", color: "#1E3A8A" }}>
              {userToToggle?.isActive === true ? "Deactivate" : "Activate"} User
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)" }}>
              {userToToggle?.isActive === true 
                ? `Are you sure you want to deactivate ${userToToggle?.name}? The user will be marked as deactivated.`
                : `Are you sure you want to activate ${userToToggle?.name}? This will restore the user using the restore API.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowStatusDialog(false)
                setUserToToggle(null)
              }}
              style={{
                borderColor: "#1E3A8A",
                color: "#1E3A8A",
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleStatus}
              style={{
                backgroundColor: userToToggle?.isActive === true ? "#DC2626" : "#059669",
                color: "#FFFFFF",
              }}
            >
              {userToToggle?.isActive === true ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload CSV Dialog */}
      <Dialog open={showUploadCSVDialog} onOpenChange={setShowUploadCSVDialog}>
        <DialogContent style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", maxWidth: "500px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: "20px", fontWeight: "bold", color: "#1E3A8A" }}>
              Upload CSV File
            </DialogTitle>
            <DialogDescription style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)" }}>
              Upload a CSV file to bulk import users
            </DialogDescription>
          </DialogHeader>
          <div style={{ marginTop: "20px" }}>
            <input
              type="file"
              accept=".csv"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(30, 58, 138, 0.2)",
                fontSize: "14px",
                color: "#1E3A8A",
              }}
            />
          </div>
          <DialogFooter style={{ marginTop: "24px" }}>
            <Button
              variant="outline"
              onClick={() => setShowUploadCSVDialog(false)}
              style={{
                borderColor: "#1E3A8A",
                color: "#1E3A8A",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.info("Coming Soon", {
                  description: "CSV upload functionality will be implemented soon.",
                })
                setShowUploadCSVDialog(false)
              }}
              style={{
                backgroundColor: "#3B82F6",
                color: "#FFFFFF",
              }}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Class Dialog */}
      <Dialog open={showAssignClassDialog} onOpenChange={setShowAssignClassDialog}>
        <DialogContent style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", maxWidth: "500px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: "20px", fontWeight: "bold", color: "#1E3A8A" }}>
              Assign Class
            </DialogTitle>
            <DialogDescription style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)" }}>
              Assign classes to selected users
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
            {/* Filter by Organization - Admin only */}
            {isAdministrator() && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#1E3A8A",
                  marginBottom: "8px",
                }}
              >
                Filter by Organization:
              </label>
              <div data-dropdown style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setIsAssignOrgDropdownOpen(!isAssignOrgDropdownOpen)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(30, 58, 138, 0.2)",
                    fontSize: "14px",
                    color: "#1E3A8A",
                    backgroundColor: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <span>{assignClassForm.filterOrganization === "all" ? "All Organizations" : assignClassForm.filterOrganization}</span>
                  <ChevronDown style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                </button>
                {isAssignOrgDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "4px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(30, 58, 138, 0.2)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      maxHeight: "200px",
                      overflow: "auto",
                      zIndex: 50,
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Search organizations..."
                      value={assignOrgSearchTerm}
                      onChange={(e) => setAssignOrgSearchTerm(e.target.value)}
                      onFocus={(e) => e.stopPropagation()}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAssignClassForm({
                          ...assignClassForm,
                          filterOrganization: "all",
                          selectedUserId: "",
                        })
                        setIsAssignOrgDropdownOpen(false)
                        setAssignOrgSearchTerm("")
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        textAlign: "left",
                        border: "none",
                        background: assignClassForm.filterOrganization === "all" ? "rgba(59, 130, 246, 0.1)" : "transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#1E3A8A",
                      }}
                    >
                      All Organizations
                    </button>
                    {organizations
                      .filter((org) =>
                        org.organisation.toLowerCase().includes(assignOrgSearchTerm.toLowerCase())
                      )
                      .map((org) => (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => {
                            setAssignClassForm({
                              ...assignClassForm,
                              filterOrganization: org.organisation,
                              selectedUserId: "",
                            })
                            setIsAssignOrgDropdownOpen(false)
                            setAssignOrgSearchTerm("")
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            textAlign: "left",
                            border: "none",
                            background: assignClassForm.filterOrganization === org.organisation ? "rgba(59, 130, 246, 0.1)" : "transparent",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#1E3A8A",
                          }}
                        >
                          {org.organisation}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Select User */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#1E3A8A",
                  marginBottom: "8px",
                }}
              >
                Select User
              </label>
              <div data-dropdown style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(30, 58, 138, 0.2)",
                    fontSize: "14px",
                    color: "#1E3A8A",
                    backgroundColor: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <span>
                    {assignClassForm.selectedUserId
                      ? (assignDialogUsers.find((u) => u.id === assignClassForm.selectedUserId) ?? users.find((u) => u.id === assignClassForm.selectedUserId))?.name || "Select a user"
                      : "Select a user"}
                  </span>
                  <ChevronDown style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                </button>
                {isUserDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "4px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(30, 58, 138, 0.2)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      maxHeight: "200px",
                      overflow: "auto",
                      zIndex: 50,
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      onFocus={(e) => e.stopPropagation()}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                    {assignDialogUsersLoading && (
                      <div style={{ padding: "10px 12px", fontSize: "14px", color: "rgba(30, 58, 138, 0.7)" }}>
                        Loading users…
                      </div>
                    )}
                    {!assignDialogUsersLoading && assignDialogUsers
                      .filter((user) => {
                        const search = userSearchTerm.toLowerCase()
                        return !search || user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search)
                      })
                      .map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setAssignClassForm({ ...assignClassForm, selectedUserId: user.id })
                            setIsUserDropdownOpen(false)
                            setUserSearchTerm("")
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            textAlign: "left",
                            border: "none",
                            background: assignClassForm.selectedUserId === user.id ? "rgba(59, 130, 246, 0.1)" : "transparent",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#1E3A8A",
                          }}
                        >
                          {user.name} ({user.email})
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Classes (typable dropdown) */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#1E3A8A",
                  marginBottom: "8px",
                }}
              >
                Classes
              </label>
              <p style={{ fontSize: "12px", color: "rgba(30, 58, 138, 0.6)", margin: "0 0 8px 0" }}>
                Multi-select: click each class to add or remove (result saved as comma-separated)
              </p>
              <div data-dropdown style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    const opening = !isAssignClassesDropdownOpen
                    setIsAssignClassesDropdownOpen(opening)
                    setIsAssignOrgDropdownOpen(false)
                    setIsUserDropdownOpen(false)
                    if (opening) loadAssignDialogClasses()
                  }}
                  style={{
                    width: "100%",
                    minHeight: "42px",
                    padding: "8px 12px",
                    paddingRight: "36px",
                    borderRadius: "8px",
                    border: "1px solid rgba(30, 58, 138, 0.2)",
                    fontSize: "14px",
                    color: "#1E3A8A",
                    backgroundColor: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    textAlign: "left",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  <span style={{ flex: 1 }}>
                    {(() => {
                      const selected = assignClassForm.classes.split(",").map((c) => c.trim()).filter(Boolean)
                      if (selected.length === 0) return "Select classes..."
                      if (selected.length === 1) return selected[0]
                      return `${selected.length} classes: ${selected.join(", ")}`
                    })()}
                  </span>
                  <ChevronDown style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                </button>
                {isAssignClassesDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "4px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(30, 58, 138, 0.2)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      maxHeight: "220px",
                      overflow: "auto",
                      zIndex: 50,
                    }}
                  >
                    {orgClassesListLoading && (
                      <div style={{ padding: "10px 12px", fontSize: "14px", color: "rgba(30, 58, 138, 0.7)" }}>
                        Loading classes…
                      </div>
                    )}
                    {!orgClassesListLoading && orgClassesList.length === 0 && (
                      <div style={{ padding: "10px 12px", fontSize: "14px", color: "rgba(30, 58, 138, 0.6)" }}>
                        {isAdministrator() && assignClassForm.filterOrganization === "all"
                          ? "Select an organization above to load classes."
                          : "No classes found. Add classes via Add/Update Classes."}
                      </div>
                    )}
                    {!orgClassesListLoading && orgClassesList.map((cls) => {
                      const selected = assignClassForm.classes
                        .split(",")
                        .map((c) => c.trim())
                        .filter(Boolean)
                        .includes(cls)
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            const current = assignClassForm.classes
                              .split(",")
                              .map((c) => c.trim())
                              .filter(Boolean)
                            const next = selected ? current.filter((c) => c !== cls) : [...current, cls]
                            setAssignClassForm({ ...assignClassForm, classes: next.join(", ") })
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            textAlign: "left",
                            border: "none",
                            background: assignClassForm.classes.split(",").map((c) => c.trim()).filter(Boolean).includes(cls) ? "rgba(59, 130, 246, 0.15)" : "transparent",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#1E3A8A",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          {selected && <Check style={{ width: "16px", height: "16px", flexShrink: 0, color: "#3B82F6" }} />}
                          {!selected && <span style={{ width: "16px", flexShrink: 0 }} />}
                          {cls}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter style={{ marginTop: "24px" }}>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignClassDialog(false)
                setAssignClassForm({
                  filterOrganization: "all",
                  selectedUserId: "",
                  classes: "",
                })
              }}
              style={{
                borderColor: "#1E3A8A",
                color: "#1E3A8A",
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={assignClassSubmitting}
              onClick={async () => {
                if (!assignClassForm.selectedUserId || !assignClassForm.classes) {
                  toast.error("Please select a user and enter classes")
                  return
                }
                const selectedUser = assignDialogUsers.find((u) => u.id === assignClassForm.selectedUserId) ?? users.find((u) => u.id === assignClassForm.selectedUserId)
                if (!selectedUser) return
                const classArray = assignClassForm.classes
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean)
                const nameParts = (selectedUser.name || "").trim().split(/\s+/)
                const first_name = nameParts[0] ?? ""
                const last_name = nameParts.slice(1).join(" ") ?? ""
                const userId = selectedUser.user_id ?? (selectedUser.id ? parseInt(selectedUser.id, 10) : 0)
                const orgId = selectedUser.organisation_id ?? 0
                if (!userId || !orgId) {
                  toast.error("User or organisation missing")
                  return
                }
                setAssignClassSubmitting(true)
                try {
                  const res = await updateUser({
                    user_id: userId,
                    first_name,
                    last_name,
                    email: selectedUser.email || "",
                    role: mapUIRoleToApiRole(selectedUser.role),
                    organisation_id: orgId,
                    class: classArray,
                  })
                  if (res && (res as any).success === false) throw new Error((res as any).message || "Failed to update classes")
                  setUsers((prev) =>
                    prev.map((user) =>
                      user.id === assignClassForm.selectedUserId ? { ...user, classes: assignClassForm.classes } : user
                    )
                  )
                  setAssignDialogUsers((prev) =>
                    prev.map((user) =>
                      user.id === assignClassForm.selectedUserId ? { ...user, classes: assignClassForm.classes } : user
                    )
                  )
                  toast.success(`Classes assigned to ${selectedUser.name}`, { description: classArray.join(", "), duration: 3000 })
                  setShowAssignClassDialog(false)
                  setAssignClassForm({ filterOrganization: "all", selectedUserId: "", classes: "" })
                  loadUsers().catch(() => {})
                } catch (e: any) {
                  toast.error("Failed to update classes", { description: e?.message || "Please try again.", duration: 5000 })
                } finally {
                  setAssignClassSubmitting(false)
                }
              }}
              style={{
                backgroundColor: "#3B82F6",
                color: "#FFFFFF",
              }}
            >
              {assignClassSubmitting ? "Updating…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Update Classes Dialog (Principal and Admin only) */}
      <Dialog open={showClassesUpdateDialog} onOpenChange={(open) => { setShowClassesUpdateDialog(open); if (!open) { setClassesUpdateError(null); setClassesUpdateList(""); setClassesUpdateOrgId(""); } }}>
        <DialogContent style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", maxWidth: "500px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: "20px", fontWeight: "bold", color: "#1E3A8A" }}>
              Add/Update Classes
            </DialogTitle>
            <DialogDescription style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)" }}>
              Replace organisation classes with the list below (one per line or comma-separated).
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
            {isAdministrator() && (
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#1E3A8A", marginBottom: "8px" }}>
                  Organisation
                </label>
                <select
                  value={classesUpdateOrgId}
                  onChange={(e) => setClassesUpdateOrgId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(30, 58, 138, 0.2)",
                    fontSize: "14px",
                    color: "#1E3A8A",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={String(org.id)}>{org.organisation}</option>
                  ))}
                </select>
              </div>
            )}
            {isPrincipal() && authData?.user?.organisation_id != null && (
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#1E3A8A", marginBottom: "8px" }}>
                  Organisation
                </label>
                <div style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(30, 58, 138, 0.2)", fontSize: "14px", color: "#1E3A8A", backgroundColor: "rgba(30, 58, 138, 0.05)" }}>
                  {organizations.find((o) => o.id === authData?.user?.organisation_id)?.organisation ?? "Your organisation"}
                </div>
              </div>
            )}
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#1E3A8A", marginBottom: "8px" }}>
                Classes
              </label>
              <p style={{ fontSize: "12px", color: "rgba(30, 58, 138, 0.6)", margin: "0 0 8px 0" }}>
                One per line or comma-separated, e.g. 3-A, 4-A, 5-A, +1, +2
              </p>
              <textarea
                value={classesUpdateList}
                onChange={(e) => setClassesUpdateList(e.target.value)}
                placeholder={"3-A\n4-A\n5-A\n6-A\n7-A\n8-A\n9-A\n10-A\n+1\n+2"}
                rows={6}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(30, 58, 138, 0.2)",
                  fontSize: "14px",
                  color: "#1E3A8A",
                  backgroundColor: "#FFFFFF",
                  resize: "vertical",
                }}
              />
            </div>
            {classesUpdateError && (
              <p style={{ fontSize: "13px", color: "#DC2626", margin: 0 }}>{classesUpdateError}</p>
            )}
          </div>
          <DialogFooter style={{ marginTop: "24px" }}>
            <Button
              variant="outline"
              onClick={() => { setShowClassesUpdateDialog(false); setClassesUpdateError(null); setClassesUpdateList(""); setClassesUpdateOrgId(""); }}
              disabled={classesUpdateLoading}
              style={{ borderColor: "#1E3A8A", color: "#1E3A8A" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClassesUpdateSubmit}
              disabled={classesUpdateLoading}
              style={{ backgroundColor: "#3B82F6", color: "#FFFFFF" }}
            >
              {classesUpdateLoading ? "Updating…" : "Update Classes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  )
}
