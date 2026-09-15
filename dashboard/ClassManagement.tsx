"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "./ui/button"
import { useAuth } from "../contexts/AuthContext"
import {
  Mic2,
  Briefcase,
  Users,
  Settings,
  Shield,
  FileText,
  LogOut,
  ChevronLeft,
  Plus,
  Edit,
  Upload,
  UserPlus,
  X,
  Check,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"

interface User {
  id: string
  user_id?: number // API user_id for API calls
  name: string
  email: string
  role: "Company Learner" | "Company Trainer" | "Company Manager" | "Company Administrator"
  classes: string | number
  organization: string
  organisation_id?: number // API organisation_id
  isActive?: boolean // Status: active or inactive
}

interface Organisation {
  id: number
  organisation: string
}

export function ClassManagement() {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [filterOrganization, setFilterOrganization] = useState<string>("all")
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
  
  // Get API token from auth context
  const API_TOKEN = token || "1115d098bca3b1660fffa93461c486510c3429c25ec6d56383694ce89f6484c8"

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "Company Learner" as User["role"],
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

  // Organizations from API
  const [organizations, setOrganizations] = useState<Organisation[]>([])
  const [organizationsList, setOrganizationsList] = useState<string[]>(["All Organizations"])
  
  // Classes from API (extracted from users - classes are in array format)
  const [availableClasses, setAvailableClasses] = useState<string[]>([])

  // Sample users data
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "Abhirami B R",
      email: "abhiramibr2011@gmail.com",
      role: "Company Learner",
      classes: "9",
      organization: "CSI WF CENTRAL SCHOOL  Karakonam",
    },
    {
      id: "2",
      name: "Sajith Pillai",
      email: "xeleratelearningindia@outlook.com",
      role: "Company Trainer",
      classes: "1A",
      organization: "ABC School",
    },
    {
      id: "3",
      name: "Reshma",
      email: "reshma@example.com",
      role: "Company Manager",
      classes: "2B",
      organization: "XYZ School",
    },
    {
      id: "4",
      name: "John Doe",
      email: "john.doe@example.com",
      role: "Company Learner",
      classes: "None",
      organization: "Green Valley School",
    },
    {
      id: "5",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      role: "Company Administrator",
      classes: "7",
      organization: "Sunshine Academy",
    },
  ])

  const menuItems = [
    { id: "english-pro-ai", label: "English Pro AI", icon: Mic2, route: "/skills-home" },
    { id: "dashboard", label: "Dashboard", icon: Briefcase, route: "/edu/home" },
    { id: "class-management", label: "Class Management", icon: Users, route: "/class-management", active: true },
    { id: "license-management", label: "License Management", icon: Shield, route: "/license-management" },
  ]

  const getInitials = (name: string) => {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  // Map API role to UI role
  const mapApiRoleToUIRole = (apiRole: string): User["role"] => {
    const roleMap: Record<string, User["role"]> = {
      student: "Company Learner",
      teacher: "Company Trainer",
      manager: "Company Manager",
      administrator: "Company Administrator",
      admin: "Company Administrator",
    }
    return roleMap[apiRole.toLowerCase()] || "Company Learner"
  }

  // Map UI role to API role
  const mapUIRoleToApiRole = (uiRole: User["role"]): string => {
    const roleMap: Record<User["role"], string> = {
      "Company Learner": "student",
      "Company Trainer": "teacher",
      "Company Manager": "manager",
      "Company Administrator": "administrator",
    }
    return roleMap[uiRole] || "student"
  }

  // API function to fetch organizations list
  const fetchOrganizations = async () => {
    const API_URL = "https://api.exeleratetechnology.com/api/org/list.php"

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
    const API_URL = "https://api.exeleratetechnology.com/api/users/create.php"

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
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error("Error creating user:", error)
      throw error
    }
  }

  // API function to fetch users list
  const fetchUsers = async () => {
    const API_URL = "https://api.exeleratetechnology.com/api/users/list.php"

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
    const API_URL = "https://api.exeleratetechnology.com/api/users/update.php"

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
    const API_URL = "https://api.exeleratetechnology.com/api/users/delete.php"

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
    const API_URL = "https://api.exeleratetechnology.com/api/users/restore.php"

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

  // Load users from API
  const loadUsers = async () => {
    try {
      const response = await fetchUsers()
      console.log("Fetched users from API:", response)

      if (response && response.success === true && Array.isArray(response.data)) {
        // Extract unique classes from all users (classes are in array format like ["10-A", "9-B"])
        const allClasses = new Set<string>()
        response.data.forEach((user: any) => {
          const userClasses = user.class || []
          if (Array.isArray(userClasses)) {
            userClasses.forEach((className: any) => {
              if (className && String(className).trim()) {
                allClasses.add(String(className).trim())
              }
            })
          } else if (userClasses && String(userClasses).trim()) {
            allClasses.add(String(userClasses).trim())
          }
        })
        const uniqueClasses = Array.from(allClasses).sort()
        setAvailableClasses(uniqueClasses)
        console.log("Available classes from API:", uniqueClasses)
        
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

        if (fetchedUsers.length > 0) {
          // Merge API response with existing deactivated users
          // API might not return deactivated users, so we preserve them in state
          setUsers(prevUsers => {
            const apiUserIds = new Set(fetchedUsers.map(u => u.id))
            const existingDeactivatedUsers = prevUsers.filter(u => !apiUserIds.has(u.id) && u.isActive === false)
            const mergedUsers = [...fetchedUsers, ...existingDeactivatedUsers]
            console.log(`Loaded ${fetchedUsers.length} users from API, preserved ${existingDeactivatedUsers.length} deactivated users`)
            return mergedUsers
          })
        } else {
          // If API returns empty, preserve existing deactivated users
          setUsers(prevUsers => prevUsers.filter(u => u.isActive === false))
        }
      }
    } catch (error) {
      console.error("Error loading users:", error)
      // Keep using sample data if API fails
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadOrganizations().then(() => {
      // Load users after organizations are loaded
      loadUsers()
    })
  }, [])

  // Reload users when organizations are loaded
  useEffect(() => {
    if (organizations.length > 0) {
      loadUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizations.length])

  // Filter users by organization only (NOT by isActive status)
  // IMPORTANT: Deactivated users ARE shown - they are not filtered out
  // The API uses soft delete (deactivate) via delete.php and restore.php, not hard delete
  const filteredUsers = users.filter((user) => {
    if (filterOrganization === "all") return true
    return user.organization === filterOrganization
  })

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
      alert("Please fill in all required fields including Organisation")
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
        // Refresh users from API
        await loadUsers()

        resetForm()
        setShowAddUserModal(false)
        setShowAddUserForm(false)
        alert(`User "${formData.firstName} ${formData.lastName}" created successfully!`)
      } else {
        throw new Error(response.message || "Failed to create user")
      }
    } catch (error: any) {
      console.error("Error creating user:", error)
      setError(error.message || "Failed to create user. Please try again.")
      alert(`Error: ${error.message || "Failed to create user. Please try again."}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle edit user
  const handleEditUser = (user: User) => {
    const nameParts = user.name.split(" ")
    // user.classes is already a string (comma-separated if multiple) from loadUsers mapping
    // For editing, use the first class if multiple, or the single class
    const classesValue = user.classes && user.classes !== "None" && typeof user.classes === "string"
      ? user.classes.split(",")[0].trim() // Take first class if comma-separated
      : (user.classes && typeof user.classes === "number" ? String(user.classes) : "")
    
    setFormData({
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: user.email,
      role: user.role,
      classes: classesValue,
      organization: user.organization,
      organisation_id: user.organisation_id?.toString() || "",
    })
    setEditingUser(user)
    setShowAddUserModal(true)
  }

  // Handle update user
  const handleUpdateUser = async () => {
    if (!editingUser || !formData.firstName || !formData.lastName || !formData.email || !formData.organisation_id) {
      alert("Please fill in all required fields including Organisation")
      return
    }

    const userId = parseInt(editingUser.id)
    if (isNaN(userId) || userId <= 0) {
      alert("Invalid User ID. Please refresh the page and try again.")
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
        // Refresh users from API
        await loadUsers()

        resetForm()
        setEditingUser(null)
        setShowAddUserModal(false)
        alert(`User "${formData.firstName} ${formData.lastName}" updated successfully!`)
      } else {
        throw new Error(response.message || "Failed to update user")
      }
    } catch (error: any) {
      console.error("Error updating user:", error)
      setError(error.message || "Failed to update user. Please try again.")
      alert(`Error: ${error.message || "Failed to update user. Please try again."}`)
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
      alert("Invalid User ID. Please refresh the page and try again.")
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

      const successMessage = currentStatus 
        ? `User "${userToToggle.name}" has been deactivated successfully!`
        : `User "${userToToggle.name}" has been activated successfully!`
      alert(successMessage)
    } catch (error: any) {
      console.error("Error toggling user status:", error)
      const action = currentStatus ? "deactivate" : "activate"
      let errorMessage = error.message || `Failed to ${action} user. Please try again.`
      
      // Normalize error message to lowercase for checking
      const errorLower = errorMessage.toLowerCase()
      
      // Handle specific error cases with better, user-friendly messages based on the action
      if (errorLower.includes("already active")) {
        // This error can occur if we tried to activate but user is already active
        if (!currentStatus) {
          errorMessage = "Unable to activate: This user is already active in the system. The status displayed may be incorrect. Refreshing the user list to show the correct status."
        } else {
          errorMessage = "Unable to deactivate: This user is already active. This may indicate a data synchronization issue. Refreshing the user list."
        }
        await loadUsers()
        alert(errorMessage)
      } else if (errorLower.includes("already inactive") || errorLower.includes("already deactivated") || errorLower.includes("already deleted")) {
        // User is already inactive/deactivated
        errorMessage = `Unable to ${action}: This user is already ${!currentStatus ? "deactivated" : "deactivated"}. Refreshing the user list to show the correct status.`
        await loadUsers()
        alert(errorMessage)
      } else if (errorLower.includes("not found") || errorLower.includes("does not exist") || errorLower.includes("invalid user")) {
        errorMessage = "User not found. The user may have been deleted. Refreshing the user list."
        await loadUsers()
        alert(errorMessage)
      } else if (errorLower.includes("not found") || errorLower.includes("does not exist") || errorLower.includes("invalid user")) {
        errorMessage = "User not found. The user may have been deleted. Refreshing the user list."
        await loadUsers()
        alert(errorMessage)
      } else if (errorLower.includes("permission") || errorLower.includes("unauthorized") || errorLower.includes("forbidden")) {
        errorMessage = "You do not have permission to perform this action. Please contact your administrator."
        alert(errorMessage)
      } else if (errorLower.includes("network") || errorLower.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection and try again."
        alert(errorMessage)
      } else {
        // Generic error - show the actual error message with context
        alert(`Failed to ${action} user "${userToToggle?.name || 'this user'}":\n\n${errorMessage}\n\nThe user list will be refreshed.`)
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
      alert("Please select users to deactivate")
      return
    }

    const selectedCount = selectedUsers.size
    if (!confirm(`Are you sure you want to deactivate ${selectedCount} user(s)?`)) {
      return
    }

    try {
      // Deactivate all selected users (only if they are currently active)
      const deactivatePromises = Array.from(selectedUsers).map(async (userId) => {
        const user = users.find((u) => u.id === userId)
        if (user && user.isActive === true) {
          // Use user_id if available (from API), otherwise parse from id
          const userIdNum = user.user_id || parseInt(userId)
          if (!isNaN(userIdNum) && userIdNum > 0) {
            await deactivateUser(userIdNum)
          }
        }
      })

      await Promise.all(deactivatePromises)

      // Refresh users from API
      await loadUsers()
      setSelectedUsers(new Set())
      alert(`${selectedCount} user(s) deactivated successfully!`)
    } catch (error: any) {
      console.error("Error bulk deactivating users:", error)
      alert(`Error: ${error.message || "Failed to deactivate users. Please try again."}`)
      await loadUsers()
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      role: "Company Learner",
      classes: "",
      organization: "",
      organisation_id: "",
    })
    setEditingUser(null)
    setError(null)
  }

  const openAddUserModal = () => {
    resetForm()
    setShowAddUserModal(true)
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#1E40AF" }}>
      {/* Sidebar */}
      <div
        style={{
          width: sidebarCollapsed ? "80px" : "280px",
          backgroundColor: "#1E3A8A",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease",
          position: "fixed",
          top: 0,
          left: 0,
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
              English Pro AI
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
          {menuItems.map((item) => {
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
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Button
              onClick={() => {
                setShowAddUserForm(!showAddUserForm)
                if (!showAddUserForm) {
                  openAddUserModal()
                }
              }}
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
            <Button
              onClick={() => setShowAssignClassDialog(true)}
              variant="outline"
              style={{
                borderColor: "#3B82F6",
                color: "#3B82F6",
              }}
            >
              <Users style={{ width: "16px", height: "16px", marginRight: "8px" }} />
              Assign Class
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ padding: "32px", flex: 1, backgroundColor: "#1E40AF" }}>
          {/* Add User Section */}
          {showAddUserForm && (
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "16px",
                padding: "24px",
                marginBottom: "24px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1E3A8A", margin: 0 }}>
                  Add User
                </h2>
                <button
                  onClick={() => {
                    setShowAddUserForm(false)
                    resetForm()
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#1E3A8A",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <X style={{ width: "20px", height: "20px" }} />
                </button>
              </div>
              <Button
                onClick={openAddUserModal}
                style={{
                  backgroundColor: "#3B82F6",
                  color: "#FFFFFF",
                }}
              >
                <Plus style={{ width: "16px", height: "16px", marginRight: "8px" }} />
                Add Another User
              </Button>
            </div>
          )}

          {/* Existing Users Section */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <h2
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

            {/* Filter Section */}
            <div style={{ marginBottom: "24px" }}>
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
              <select
                value={filterOrganization}
                onChange={(e) => setFilterOrganization(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(30, 58, 138, 0.2)",
                  fontSize: "14px",
                  color: "#1E3A8A",
                  backgroundColor: "#FFFFFF",
                }}
              >
                {organizationsList.map((org) => (
                  <option key={org} value={org === "All Organizations" ? "all" : org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>

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

            {/* Users Table */}
            <div style={{ overflowX: "auto" }}>
              <table
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
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={handleSelectAll}
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                        }}
                      />
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1E3A8A",
                      }}
                    >
                      NAME
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1E3A8A",
                      }}
                    >
                      EMAIL
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1E3A8A",
                      }}
                    >
                      ROLE
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1E3A8A",
                      }}
                    >
                      CLASSES
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1E3A8A",
                      }}
                    >
                      ORGANIZATION
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1E3A8A",
                      }}
                    >
                      STATUS
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1E3A8A",
                      }}
                    >
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)" }}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
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
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User["role"] })}
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
                <option value="Company Learner">Company Learner</option>
                <option value="Company Trainer">Company Trainer</option>
                <option value="Company Manager">Company Manager</option>
                <option value="Company Administrator">Company Administrator</option>
              </select>
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
              <select
                value={formData.classes}
                onChange={(e) => setFormData({ ...formData, classes: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(30, 58, 138, 0.2)",
                  fontSize: "14px",
                  color: "#1E3A8A",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                <option value="">Select a class</option>
                {availableClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
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
              <select
                value={formData.organisation_id}
                onChange={(e) => {
                  const selectedOrg = organizations.find((o) => o.id.toString() === e.target.value)
                  setFormData({
                    ...formData,
                    organisation_id: e.target.value,
                    organization: selectedOrg?.organisation || "",
                  })
                }}
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
                <option value="">Select Organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id.toString()}>
                    {org.organisation}
                  </option>
                ))}
              </select>
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
                // Handle CSV upload
                alert("CSV upload functionality will be implemented")
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
            {/* Filter by Organization */}
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
              <select
                value={assignClassForm.filterOrganization}
                onChange={(e) => {
                  setAssignClassForm({
                    ...assignClassForm,
                    filterOrganization: e.target.value,
                    selectedUserId: "", // Reset user selection when organization changes
                  })
                }}
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
                <option value="all">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.organisation}>
                    {org.organisation}
                  </option>
                ))}
              </select>
            </div>

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
              <select
                value={assignClassForm.selectedUserId}
                onChange={(e) => {
                  setAssignClassForm({ ...assignClassForm, selectedUserId: e.target.value })
                }}
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
                <option value="">Select a user</option>
                {users
                  .filter((user) => {
                    if (assignClassForm.filterOrganization === "all") return true
                    return user.organization === assignClassForm.filterOrganization
                  })
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
              </select>
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
                Classes (comma-separated)
              </label>
              <p style={{ fontSize: "12px", color: "rgba(30, 58, 138, 0.6)", margin: "0 0 8px 0" }}>
                e.g., 1A, 2B
              </p>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  list="classes-list"
                  value={assignClassForm.classes}
                  onChange={(e) => {
                    setAssignClassForm({ ...assignClassForm, classes: e.target.value })
                  }}
                  placeholder="Select a class or type to add"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    paddingRight: "40px",
                    borderRadius: "8px",
                    border: "1px solid rgba(30, 58, 138, 0.2)",
                    fontSize: "14px",
                    color: "#1E3A8A",
                    backgroundColor: "#FFFFFF",
                  }}
                />
                <datalist id="classes-list">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={`Class ${num}`} />
                  ))}
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <option key={`${num}A`} value={`${num}A`} />
                  ))}
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <option key={`${num}B`} value={`${num}B`} />
                  ))}
                </datalist>
                <div
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="#1E3A8A"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
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
              onClick={() => {
                if (!assignClassForm.selectedUserId || !assignClassForm.classes) {
                  alert("Please select a user and enter classes")
                  return
                }
                // Handle class assignment
                const selectedUser = users.find((u) => u.id === assignClassForm.selectedUserId)
                if (selectedUser) {
                  setUsers(
                    users.map((user) =>
                      user.id === assignClassForm.selectedUserId
                        ? { ...user, classes: assignClassForm.classes }
                        : user
                    )
                  )
                  alert(`Classes "${assignClassForm.classes}" assigned to ${selectedUser.name}`)
                }
                setShowAssignClassDialog(false)
                setAssignClassForm({
                  filterOrganization: "all",
                  selectedUserId: "",
                  classes: "",
                })
              }}
              style={{
                backgroundColor: "#3B82F6",
                color: "#FFFFFF",
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
