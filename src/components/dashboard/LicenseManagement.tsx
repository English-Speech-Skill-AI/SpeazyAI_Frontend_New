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
  Edit,
  Menu,
} from "lucide-react"
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

interface License {
  id: string
  organization: string
  licenseId: string
  type: "Education" | "Corporate" | "N/A"
  license: string
  assigned: number
  available: number
  expiry: string
  daysLeft: number
  address?: string // Optional address field from API
  isActive?: boolean // Status: active or inactive
}

export function LicenseManagement() {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false)
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
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showAddPrincipalModal, setShowAddPrincipalModal] = useState(false)
  const [newlyRegisteredOrg, setNewlyRegisteredOrg] = useState<{ organisation_id: number; organisation_name: string } | null>(null)
  const [addPrincipalForm, setAddPrincipalForm] = useState({ firstName: "", lastName: "", email: "" })
  const [addPrincipalLoading, setAddPrincipalLoading] = useState(false)
  const [addPrincipalError, setAddPrincipalError] = useState<string | null>(null)
  const [editingLicense, setEditingLicense] = useState<License | null>(null)
  const [licenseToToggle, setLicenseToToggle] = useState<License | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { authData, logout, token } = useAuth()
  const apiBase = getExelerateApiBase() + "/api"
  const API_TOKEN = token || (authData as any)?.token || ""

  // Register form state
  const [registerFormData, setRegisterFormData] = useState({
    organizationName: "",
    address: "",
    licenseType: "EnglishSkill AI",
    assignedLicenses: "",
    startDate: "",
    expiryDate: "",
  })

  // Update form state
  const [updateFormData, setUpdateFormData] = useState({
    organisationId: "",
    organisation: "",
    address: "",
    newExpiryDate: "",
    newAssignedLicenses: "",
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Sample licenses data (fallback if API fails - filtered by role)
  const sampleLicenses: License[] = [
    {
      id: "1",
      organization: "Kerala Public School",
      licenseId: "1062",
      type: "Education",
      license: "EnglishSkill AI",
      assigned: 500,
      available: 500,
      expiry: "2025-12-31",
      daysLeft: -7,
      isActive: true,
    },
    {
      id: "2",
      organization: "Lorene levavasseur",
      licenseId: "1074",
      type: "Education",
      license: "EnglishSkill AI",
      assigned: 10,
      available: 9,
      expiry: "2026-03-31",
      daysLeft: 83,
      isActive: true,
    },
    {
      id: "3",
      organization: "Loyola School",
      licenseId: "1042",
      type: "N/A",
      license: "EnglishSkill AI",
      assigned: 10,
      available: 9,
      expiry: "2025-08-18",
      daysLeft: -142,
      isActive: false,
    },
    {
      id: "4",
      organization: "Xelerate Learning",
      licenseId: "1009",
      type: "Corporate",
      license: "EnglishSkill AI",
      assigned: 100,
      available: 89,
      expiry: "2030-12-31",
      daysLeft: 1819,
      isActive: true,
    },
    {
      id: "5",
      organization: "Mother India School",
      licenseId: "1076",
      type: "Education",
      license: "EnglishSkill AI",
      assigned: 8,
      available: 0,
      expiry: "2026-06-30",
      daysLeft: 174,
      isActive: true,
    },
    {
      id: "6",
      organization: "AVK Public School",
      licenseId: "1012",
      type: "Education",
      license: "EnglishSkill AI",
      assigned: 500,
      available: 492,
      expiry: "2026-12-31",
      daysLeft: 358,
      isActive: true,
    },
    {
      id: "7",
      organization: "Shalini Bhavan English Medium School",
      licenseId: "1063",
      type: "Education",
      license: "EnglishSkill AI",
      assigned: 10,
      available: 0,
      expiry: "2026-05-15",
      daysLeft: 128,
      isActive: false,
    },
    {
      id: "8",
      organization: "XelerateCorporateTest",
      licenseId: "1064",
      type: "Corporate",
      license: "EnglishSkill AI",
      assigned: 10,
      available: 7,
      expiry: "2027-01-31",
      daysLeft: 389,
      isActive: true,
    },
    {
      id: "9",
      organization: "Red Chip Solutions",
      licenseId: "1047",
      type: "Corporate",
      license: "EnglishSkill AI",
      assigned: 100,
      available: 94,
      expiry: "2028-12-31",
      daysLeft: 1084,
      isActive: true,
    },
    {
      id: "10",
      organization: "New Meaning Foundation",
      licenseId: "1065",
      type: "Corporate",
      license: "EnglishSkill AI",
      assigned: 30,
      available: 29,
      expiry: "2027-06-30",
      daysLeft: 539,
      isActive: true,
    },
    {
      id: "11",
      organization: "Nicole Perry Ellis Coaching Consulting",
      licenseId: "1066",
      type: "Corporate",
      license: "EnglishSkill AI",
      assigned: 30,
      available: 29,
      expiry: "2027-08-15",
      daysLeft: 585,
      isActive: false,
    },
  ]

  const [licenses, setLicenses] = useState<License[]>([])

  const menuItems = [
    { id: "english-skill-ai", label: "English Skill AI", icon: Mic2, route: "/skills-home" },
    { id: "dashboard", label: "Dashboard", icon: Briefcase, route: "/progress-dashboard" },
    { id: "class-management", label: "Class Management", icon: Users, route: "/progress-dashboard/classes" },
    { id: "license-management", label: "License Management", icon: Shield, route: "/progress-dashboard/license", active: true },
  ]

  const getInitials = (name: string) => {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  // Check if logged-in user is administrator
  const isAdministrator = () => {
    if (!authData?.user?.role) return false
    const userRole = (authData.user.role || "").toLowerCase()
    return userRole === "administrator" || userRole.includes("admin")
  }

  // Helper function to check if user is principal
  const isPrincipal = () => {
    if (!authData?.user?.role) return false
    const userRole = (authData.user.role || "").toLowerCase()
    return userRole === "principal" || userRole.includes("principal") || userRole === "company manager"
  }

  // Helper function to filter licenses based on user role
  const filterLicensesByRole = (licensesToFilter: License[]): License[] => {
    if (isAdministrator()) return licensesToFilter
    if (isPrincipal()) {
      const userOrgId = authData?.user?.organisation_id
      if (userOrgId) {
        const orgIdString = String(userOrgId)
        return licensesToFilter.filter(
          (license) => license.licenseId === orgIdString || license.id === orgIdString
        )
      }
      return []
    }
    return []
  }

  // Calculate days left from expiry date (moved before loadOrganizations to avoid reference error)
  const calculateDaysLeft = (expiryDate: string): number => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    // Set both dates to start of day to avoid time-of-day issues
    today.setHours(0, 0, 0, 0)
    expiry.setHours(0, 0, 0, 0)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // API function to fetch organizations list
  const fetchOrganizations = async () => {
    const API_URL = `${getExelerateApiBase()}/api/org/list.php`
    const API_TOKEN = token || authData?.token

    if (!API_TOKEN) {
      throw new Error("Authentication token not available. Please login again.")
    }

    console.log("Fetching organizations with token:", API_TOKEN.substring(0, 20) + "...")

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `API Error (${response.status})`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorMessage
          console.error("API Error Response:", errorData)
        } catch {
          console.error("API Error Text:", errorText)
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error("Error fetching organizations:", error)
      throw error
    }
  }

  // Function to load organizations from API
  const loadOrganizations = async () => {
    try {
      const response = await fetchOrganizations()
      console.log("Fetched organizations from API:", response)
      
      // Handle the API response format: { success: true, data: [...], pagination: {...} }
      if (response && response.success === true && Array.isArray(response.data)) {
        const fetchedLicenses: License[] = response.data.map((org: any) => {
          try {
            // Calculate days left
            const daysLeft = org.expiry ? calculateDaysLeft(org.expiry) : 0
            
            // All organizations are Education type
            return {
              id: org.id?.toString() || Date.now().toString(),
              organization: org.organisation || "Unknown",
              licenseId: org.id?.toString() || Date.now().toString(),
              type: "Education", // Always Education
              license: org.license === "englishskillsai" ? "EnglishSkill AI" : (org.license || "EnglishSkill AI"),
              assigned: org.assigned_licenses || 0,
              available:
                org.available_licenses !== undefined && org.available_licenses !== null
                  ? org.available_licenses
                  : org.assigned_licenses || 0,
              expiry: org.expiry || "",
              daysLeft: daysLeft,
              address: org.address || "", // Store address from API
              isActive: org.is_active === 1 || org.is_active === true, // Map is_active from API
            }
          } catch (mapError) {
            console.error("Error mapping organization:", org, mapError)
            return null
          }
        }).filter((license): license is License => license !== null)
        
        // Filter licenses based on user role BEFORE setting state
        const filteredLicenses = filterLicensesByRole(fetchedLicenses)
        setLicenses(filteredLicenses)
        console.log(
          `Loaded ${fetchedLicenses.length} organizations from API, filtered to ${filteredLicenses.length} based on user role`
        )
      }
    } catch (error) {
      // If API fails, use filtered sample data (don't show error to user)
      console.error("Error loading organizations from API:", error)
      const filteredSample = filterLicensesByRole(sampleLicenses)
      setLicenses(filteredSample)
      console.log(`Using filtered sample data: ${filteredSample.length} licenses`)
    }
  }

  // Fetch organizations from API when component mounts
  useEffect(() => {
    try {
      loadOrganizations()
    } catch (error) {
      console.error("Error in useEffect:", error)
      // Don't crash the component, just log the error
    }
  }, []) // Empty dependency array means this runs once on mount

  // Get type badge color
  const getTypeBadgeStyle = (type: License["type"]) => {
    switch (type) {
      case "Education":
        return {
          backgroundColor: "#E9D5FF",
          color: "#7C3AED",
          border: "1px solid #A78BFA",
        }
      case "Corporate":
        return {
          backgroundColor: "#DBEAFE",
          color: "#1E40AF",
          border: "1px solid #60A5FA",
        }
      case "N/A":
        return {
          backgroundColor: "#F3F4F6",
          color: "#6B7280",
          border: "1px solid #D1D5DB",
        }
      default:
        return {
          backgroundColor: "#F3F4F6",
          color: "#6B7280",
          border: "1px solid #D1D5DB",
        }
    }
  }

  // Get days left color
  const getDaysLeftColor = (daysLeft: number) => {
    if (daysLeft < 0) {
      return "#DC2626" // Red for expired
    } else if (daysLeft < 30) {
      return "#F59E0B" // Orange for expiring soon
    }
    return "#059669" // Green for valid
  }

  // Handle update license - open modal and pre-fill
  const handleUpdateLicense = (license: License) => {
    // Use the actual database ID (id field) instead of licenseId
    // Both should be the same for API-loaded data, but id is the primary key
    setUpdateFormData({
      organisationId: license.id, // Use id field which matches the database ID
      organisation: license.organization,
      address: license.address || "", // Pre-fill address if available from API
      newExpiryDate: license.expiry,
      newAssignedLicenses: license.assigned.toString(),
    })
    setEditingLicense(license)
    setShowUpdateModal(true)
  }

  // API function to create organization
  const createOrganization = async (organizationData: {
    organisation: string
    organisation_type: string
    address: string
    license: string
    start_date: string
    expiry: string
    assigned_licenses: number
  }) => {
    const API_URL = `${getExelerateApiBase()}/api/org/create.php`
    const API_TOKEN = token || authData?.token

    if (!API_TOKEN) {
      throw new Error("Authentication token not available. Please login again.")
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(organizationData),
      })

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `API Error (${response.status})`
        
        // Handle 403 Forbidden specifically
        if (response.status === 403) {
          const userRole = authData?.user?.role || "unknown"
          errorMessage = `Access Forbidden: This action requires Administrator privileges. Your current role is "${userRole}". Please contact an administrator to create organizations.`
          console.error("403 Forbidden - User role:", userRole)
        } else {
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.message || errorMessage
            console.error("Create Organization API Error Response:", errorData)
          } catch {
            console.error("Create Organization API Error Text:", errorText)
          }
        }
        throw new Error(errorMessage)
      }

      // Parse JSON response
      const data = await response.json()
      console.log("Create Organization API Response:", data)
      return data
    } catch (error: any) {
      console.error("Error creating organization:", error)
      throw error
    }
  }

  // API function to update organization
  const updateOrganization = async (organizationData: {
    organisation_id: number
    organisation: string
    address: string
    expiry?: string
    assigned_licenses?: number
  }) => {
    const API_URL = `${getExelerateApiBase()}/api/org/update.php`
    const API_TOKEN = token || authData?.token

    if (!API_TOKEN) {
      throw new Error("Authentication token not available. Please login again.")
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(organizationData),
      })

      // Parse JSON response first (even if status is not ok)
      const data = await response.json()

      // Check if response is ok
      if (!response.ok) {
        let errorMessage = `API Error (${response.status})`
        
        // Handle 403 Forbidden specifically
        if (response.status === 403) {
          const userRole = authData?.user?.role || "unknown"
          errorMessage = `Access Forbidden: This action requires Administrator privileges. Your current role is "${userRole}". Please contact an administrator to update organizations.`
          console.error("403 Forbidden - User role:", userRole)
        } else {
          // Use the error message from the API response if available
          errorMessage = data.message || errorMessage
        }
        throw new Error(errorMessage)
      }

      return data
    } catch (error: any) {
      console.error("Error updating organization:", error)
      throw error
    }
  }

  // Create user API (for Add Principal after register org)
  const createUser = async (userData: {
    first_name: string
    last_name: string
    email: string
    role: string
    organisation_id: number
    class?: string[] | string
  }) => {
    const API_URL = `${apiBase}/users/create.php`
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
        const err = JSON.parse(errorText)
        throw new Error(err.message || err.error || err.msg || "Failed to create user")
      } catch (e: any) {
        if (e.message) throw e
        throw new Error(errorText || `API Error (${response.status})`)
      }
    }
    return response.json()
  }

  const handleAddPrincipalSubmit = async () => {
    if (!newlyRegisteredOrg) return
    if (!addPrincipalForm.firstName?.trim() || !addPrincipalForm.lastName?.trim() || !addPrincipalForm.email?.trim()) {
      setAddPrincipalError("Please fill in First Name, Last Name and Email.")
      return
    }
    setAddPrincipalLoading(true)
    setAddPrincipalError(null)
    try {
      const res = await createUser({
        first_name: addPrincipalForm.firstName.trim(),
        last_name: addPrincipalForm.lastName.trim(),
        email: addPrincipalForm.email.trim(),
        role: "principal",
        organisation_id: newlyRegisteredOrg.organisation_id,
      })
      if (res.success) {
        setShowAddPrincipalModal(false)
        setNewlyRegisteredOrg(null)
        setAddPrincipalForm({ firstName: "", lastName: "", email: "" })
        toast.success("Principal added successfully!", {
          description: `${addPrincipalForm.firstName} ${addPrincipalForm.lastName} has been added to ${newlyRegisteredOrg.organisation_name}.`,
          duration: 3000,
        })
      } else {
        throw new Error(res.message || "Failed to create user")
      }
    } catch (e: any) {
      setAddPrincipalError(e?.message || "Failed to add principal. Please try again.")
      toast.error("Failed to add principal", { description: e?.message, duration: 4000 })
    } finally {
      setAddPrincipalLoading(false)
    }
  }

  // Handle register organisation
  const handleRegisterOrganisation = async () => {
    // Validate required fields
    if (
      !registerFormData.organizationName ||
      !registerFormData.address ||
      !registerFormData.startDate ||
      !registerFormData.expiryDate ||
      !registerFormData.assignedLicenses
    ) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Prepare data for API (matching the API format exactly as per curl example)
      const organizationData = {
        organisation: registerFormData.organizationName,
        organisation_type: "school",
        address: registerFormData.address,
        license: registerFormData.licenseType.toLowerCase().replace(/\s+/g, "").replace(/ai$/i, ""), // Convert "EnglishSkill AI" to "englishskills"
        start_date: registerFormData.startDate,
        expiry: registerFormData.expiryDate,
        assigned_licenses: parseInt(registerFormData.assignedLicenses),
      }

      console.log("Creating organization with data:", organizationData)

      // Call the API
      const response = await createOrganization(organizationData)

      // Handle successful response
      console.log("API Response:", response)

      // Check if API returned success (based on your Postman response)
      if (response.success === true && response.data?.organisation_id) {
        const orgId = response.data.organisation_id
        const orgName = registerFormData.organizationName
        // Calculate days left for local state
        const daysLeft = calculateDaysLeft(registerFormData.expiryDate)

        // Add to local licenses list using the organisation_id from API response
        const newLicense: License = {
          id: orgId.toString(),
          organization: orgName,
          licenseId: orgId.toString(),
          type: "Education",
          license: registerFormData.licenseType,
          assigned: parseInt(registerFormData.assignedLicenses),
          available: parseInt(registerFormData.assignedLicenses),
          expiry: registerFormData.expiryDate,
          daysLeft: daysLeft,
          isActive: true,
        }

        // Reset register form and close modal
        setRegisterFormData({
          organizationName: "",
          address: "",
          licenseType: "EnglishSkill AI",
          assignedLicenses: "",
          startDate: "",
          expiryDate: "",
        })
        setShowRegisterModal(false)
        setError(null)

        await loadOrganizations()

        toast.success("Organisation registered successfully!", {
          description: `"${orgName}" (ID: ${orgId})`,
          duration: 3000,
        })

        // Open Add Principal popup for the newly registered organisation
        setNewlyRegisteredOrg({ organisation_id: orgId, organisation_name: orgName })
        setAddPrincipalForm({ firstName: "", lastName: "", email: "" })
        setAddPrincipalError(null)
        setShowAddPrincipalModal(true)
      } else {
        throw new Error(response.message || "Failed to create organization")
      }
    } catch (error: any) {
      console.error("Error registering organization:", error)
      setError(error.message || "Failed to register organization. Please try again.")
      toast.error("Failed to register organisation", {
        description: error.message || "Please try again.",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle update organisation
  const handleUpdateOrganisation = async () => {
    // Validate required fields (API requires organisation_id, organisation, and address)
    if (!updateFormData.organisationId || !updateFormData.organisation || !updateFormData.address) {
      toast.error("Please fill in Organisation Name and Address")
      return
    }

    // Validate that organisation_id is a valid number (should be set automatically from selected license)
    const orgId = parseInt(updateFormData.organisationId)
    if (isNaN(orgId) || orgId <= 0) {
      toast.error("Invalid Organisation ID", {
        description: "Please select an organisation from the table and try again.",
      })
      return
    }

    setIsUpdating(true)
    setUpdateError(null)

    try {
      // Prepare data for API (matching the API format exactly as per curl example)
      const organizationData: {
        organisation_id: number
        organisation: string
        address: string
        expiry?: string
        assigned_licenses?: number
      } = {
        organisation_id: orgId,
        organisation: updateFormData.organisation,
        address: updateFormData.address,
      }
      if (updateFormData.newExpiryDate?.trim()) {
        organizationData.expiry = updateFormData.newExpiryDate
      }
      if (updateFormData.newAssignedLicenses?.trim()) {
        const assignedLicenses = parseInt(updateFormData.newAssignedLicenses)
        if (!isNaN(assignedLicenses) && assignedLicenses >= 0) {
          organizationData.assigned_licenses = assignedLicenses
        }
      }

      console.log("Updating organization with data:", organizationData)

      // Call the API
      const response = await updateOrganization(organizationData)

      // Handle successful response
      console.log("Update API Response:", response)

      // Check if API returned success
      if (response.success === true) {
        // Refresh the list from API to get the latest data
        await loadOrganizations()

        // Reset form
        setEditingLicense(null)
        setUpdateFormData({
          organisationId: "",
          organisation: "",
          address: "",
          newExpiryDate: "",
          newAssignedLicenses: "",
        })

        // Close modal
        setShowUpdateModal(false)

        toast.success("Organisation updated successfully!", {
          description: `"${updateFormData.organisation}"`,
          duration: 3000,
        })
      } else {
        throw new Error(response.message || "Failed to update organization")
      }
    } catch (error: any) {
      console.error("Error updating organization:", error)
      const errorMessage = error.message || "Failed to update organization. Please try again."
      
      // Provide more helpful error message
      if (errorMessage.includes("not found") || errorMessage.includes("inactive")) {
        setUpdateError(`The organisation with ID ${updateFormData.organisationId} was not found or is inactive. Please refresh the page and try again with a valid organisation.`)
      } else {
        setUpdateError(errorMessage)
      }
      
      toast.error("Failed to update organisation", {
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // API function to deactivate organization (delete)
  const deactivateOrganization = async (organisationId: number) => {
    const API_URL = `${getExelerateApiBase()}/api/org/delete.php`
    const API_TOKEN = token || authData?.token

    if (!API_TOKEN) {
      throw new Error("Authentication token not available. Please login again.")
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          organisation_id: organisationId,
        }),
      })

      // Parse JSON response first (even if status is not ok)
      const data = await response.json()

      // Check if response is ok
      if (!response.ok) {
        const errorMessage = data.message || `API Error (${response.status})`
        throw new Error(errorMessage)
      }

      return data
    } catch (error: any) {
      console.error("Error deactivating organization:", error)
      throw error
    }
  }

  // API function to activate organization (restore)
  const activateOrganization = async (organisationId: number) => {
    const API_URL = `${getExelerateApiBase()}/api/org/restore.php`
    const API_TOKEN = token || authData?.token

    if (!API_TOKEN) {
      throw new Error("Authentication token not available. Please login again.")
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          organisation_id: organisationId,
        }),
      })

      // Parse JSON response first (even if status is not ok)
      const data = await response.json()

      // Check if response is ok
      if (!response.ok) {
        const errorMessage = data.message || `API Error (${response.status})`
        throw new Error(errorMessage)
      }

      return data
    } catch (error: any) {
      console.error("Error activating organization:", error)
      throw error
    }
  }

  // Handle toggle license status (activate/deactivate)
  const handleToggleStatus = (license: License) => {
    setLicenseToToggle(license)
    setShowStatusDialog(true)
  }

  const confirmToggleStatus = async () => {
    if (!licenseToToggle) return

    const organisationId = parseInt(licenseToToggle.id)
    if (isNaN(organisationId) || organisationId <= 0) {
      toast.error("Invalid Organisation ID", {
        description: "Please refresh the page and try again.",
      })
      return
    }

    const currentStatus = licenseToToggle.isActive !== false // Default to true if undefined
    const newStatus = !currentStatus

    try {
      // Call the appropriate API based on current status
      if (currentStatus) {
        // Currently active, so deactivate (delete)
        console.log(`Deactivating organization ${organisationId}...`)
        const response = await deactivateOrganization(organisationId)
        console.log("Deactivate API Response:", response)
      } else {
        // Currently inactive, so activate (restore)
        console.log(`Activating organization ${organisationId}...`)
        const response = await activateOrganization(organisationId)
        console.log("Activate API Response:", response)
      }

      // Refresh from API to get the latest status
      await loadOrganizations()

      setLicenseToToggle(null)
      setShowStatusDialog(false)
      
      toast.success(`Organisation ${newStatus ? "activated" : "deactivated"}`, {
        description: `"${licenseToToggle.organization}"`,
        duration: 3000,
      })
    } catch (error: any) {
      console.error("Error toggling status:", error)
      toast.error("Failed to toggle status", {
        description: error.message || "Please try again.",
        duration: 5000,
      })
      // Refresh from API to revert any local changes
      await loadOrganizations()
    }
  }


  return (
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .license-sidebar {
              position: fixed !important;
              left: ${sidebarCollapsed ? "-280px" : "0"} !important;
              z-index: 1000 !important;
              height: 100vh !important;
              overflow-y: auto !important;
            }
            .license-main-content {
              margin-left: 0 !important;
              width: 100% !important;
            }
            .license-overlay {
              display: ${sidebarCollapsed ? "none" : "block"} !important;
            }
          }
          @media (max-width: 640px) {
            .license-card {
              padding: 16px !important;
            }
            .license-title {
              font-size: 18px !important;
            }
            .license-button-group {
              flex-direction: column !important;
              width: 100% !important;
            }
            .license-button-group button {
              width: 100% !important;
            }
            .license-table-container {
              overflow-x: auto !important;
            }
            .license-table {
              min-width: 600px !important;
            }
          }
        `}
      </style>
      <div
        className="license-overlay"
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
        className="license-sidebar"
        style={{
          width: sidebarCollapsed ? "80px" : "280px",
          backgroundColor: "#1E3A8A",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease, left 0.3s ease",
          position: "fixed",
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
      {isMobile && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          style={{
            position: "fixed",
            top: "16px",
            left: "16px",
            zIndex: 1001,
            backgroundColor: "#1E3A8A",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            padding: "10px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Menu style={{ width: "24px", height: "24px" }} />
        </button>
      )}
      <div
        className="license-main-content"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? "80px" : "280px"),
          transition: "margin-left 0.3s ease",
          width: isMobile ? "100%" : "auto",
          minHeight: "100vh",
        }}
      >
        {/* Top Header Bar */}
        <div
          className="license-card"
          style={{
            backgroundColor: "#FFFFFF",
            padding: isMobile ? "16px" : "24px 32px",
            borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <h1
            className="license-title"
            style={{
              fontSize: isMobile ? "20px" : "24px",
              fontWeight: "bold",
              color: "#1E3A8A",
              margin: 0,
            }}
          >
            License Status Check
          </h1>
          <div className="license-button-group" style={{ display: "flex", gap: "12px" }}>
            {isAdministrator() && (
              <Button
                onClick={() => setShowRegisterModal(true)}
                style={{
                  backgroundColor: "#1E3A8A",
                  color: "#FFFFFF",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Register Organisation
              </Button>
            )}
            {isAdministrator() && (
              <Button
                onClick={() => setShowUpdateModal(true)}
                style={{
                  backgroundColor: "#3B82F6",
                  color: "#FFFFFF",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Update Organisation
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ padding: "32px", flex: 1, backgroundColor: "#1E40AF" }}>
          {/* License Table */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="license-table-container" style={{ overflowX: "auto" }}>
              <table
                className="license-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "1200px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid rgba(30, 58, 138, 0.1)",
                      backgroundColor: "#F3F4F6",
                    }}
                  >
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1E3A8A",
                      }}
                    >
                      ORGANISATION
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
                      ID
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
                      LICENSE
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
                      ASSIGNED
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
                      AVAILABLE
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
                      EXPIRY
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
                      DAYS LEFT
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
                    {isAdministrator() && (
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#1E3A8A",
                        }}
                      >
                        ACTION
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {licenses.length === 0 ? (
                    <tr>
                      <td colSpan={isAdministrator() ? 9 : 8} style={{ padding: "40px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)" }}>
                        No licenses found
                      </td>
                    </tr>
                  ) : (
                    licenses.map((license) => {
                      const daysLeftColor = getDaysLeftColor(license.daysLeft)
                      const isActive = license.isActive !== false // Default to true if undefined
                      const statusColor = isActive ? "#059669" : "#DC2626" // Green for Active, Red for Inactive
                      const statusText = isActive ? "Active" : "Inactive"
                      const buttonColor = isActive ? "#DC2626" : "#059669" // Red for Deactivate, Green for Activate
                      const buttonText = isActive ? "Deactivate" : "Activate"
                      
                      return (
                        <tr
                          key={license.id}
                          style={{
                            borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
                            backgroundColor: "#FFFFFF",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#F3F4F6"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#FFFFFF"
                          }}
                        >
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A", fontWeight: "500" }}>
                            {license.organization}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {license.licenseId}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {license.license}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {license.assigned}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {license.available}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {license.expiry}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: "600",
                                color: daysLeftColor,
                              }}
                            >
                              {license.daysLeft}
                            </span>
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
                          {isAdministrator() && (
                            <td style={{ padding: "12px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateLicense(license)}
                                  style={{
                                    borderColor: "#3B82F6",
                                    color: "#3B82F6",
                                    fontSize: "12px",
                                    padding: "6px 12px",
                                  }}
                                >
                                  <Edit style={{ width: "14px", height: "14px", marginRight: "4px" }} />
                                  Update
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStatus(license)}
                                  style={{
                                    borderColor: buttonColor,
                                    color: buttonColor,
                                    fontSize: "12px",
                                    padding: "6px 12px",
                                  }}
                                >
                                  {buttonText}
                                </Button>
                              </div>
                            </td>
                          )}
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

      {/* Register Organisation Modal */}
      <AlertDialog 
        open={showRegisterModal} 
        onOpenChange={(open) => {
          setShowRegisterModal(open)
          if (!open) {
            // Clear form when modal closes
            setRegisterFormData({
              organizationName: "",
              address: "",
              licenseType: "EnglishSkill AI",
              assignedLicenses: "",
              startDate: "",
              expiryDate: "",
            })
            setError(null)
          }
        }}
      >
        <AlertDialogContent style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontSize: "20px", fontWeight: "bold", color: "#1E3A8A" }}>
              Register Organisation
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 0" }}>
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
                Organisation Name
              </label>
              <input
                type="text"
                value={registerFormData.organizationName}
                onChange={(e) =>
                  setRegisterFormData({ ...registerFormData, organizationName: e.target.value })
                }
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
                Address
              </label>
              <textarea
                value={registerFormData.address}
                onChange={(e) =>
                  setRegisterFormData({ ...registerFormData, address: e.target.value })
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(30, 58, 138, 0.2)",
                  fontSize: "14px",
                  color: "#1E3A8A",
                  resize: "vertical",
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
                License Type
              </label>
              <input
                type="text"
                value={registerFormData.licenseType}
                onChange={(e) =>
                  setRegisterFormData({ ...registerFormData, licenseType: e.target.value })
                }
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
                Assigned Licenses
              </label>
              <input
                type="number"
                value={registerFormData.assignedLicenses}
                onChange={(e) =>
                  setRegisterFormData({ ...registerFormData, assignedLicenses: e.target.value })
                }
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
                Start Date
              </label>
              <input
                type="date"
                value={registerFormData.startDate}
                onChange={(e) =>
                  setRegisterFormData({ ...registerFormData, startDate: e.target.value })
                }
                placeholder="yyyy-mm-dd"
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
                Expiry Date
              </label>
              <input
                type="date"
                value={registerFormData.expiryDate}
                onChange={(e) =>
                  setRegisterFormData({ ...registerFormData, expiryDate: e.target.value })
                }
                placeholder="yyyy-mm-dd"
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
            {error && (
              <p style={{ color: "#DC2626", fontSize: "14px", margin: 0 }}>
                {error}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowRegisterModal(false)
                setError(null)
                // Clear form on cancel
                setRegisterFormData({
                  organizationName: "",
                  address: "",
                  licenseType: "EnglishSkill AI",
                  assignedLicenses: "",
                  startDate: "",
                  expiryDate: "",
                })
              }}
              style={{
                borderColor: "#1E3A8A",
                color: "#1E3A8A",
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegisterOrganisation}
              disabled={isLoading}
              style={{
                backgroundColor: isLoading ? "#9CA3AF" : "#1E3A8A",
                color: "#FFFFFF",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              {isLoading ? "Registering..." : "Register Organisation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Principal to new organisation Modal */}
      <AlertDialog
        open={showAddPrincipalModal}
        onOpenChange={(open) => {
          setShowAddPrincipalModal(open)
          if (!open) {
            setNewlyRegisteredOrg(null)
            setAddPrincipalForm({ firstName: "", lastName: "", email: "" })
            setAddPrincipalError(null)
          }
        }}
      >
        <AlertDialogContent style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", maxWidth: "480px" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontSize: "20px", fontWeight: "bold", color: "#1E3A8A" }}>
              Add Principal
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.8)" }}>
              Add a Principal user to <strong>{newlyRegisteredOrg?.organisation_name ?? "this organisation"}</strong>. They will have access to manage this organisation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 0" }}>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#1E3A8A", marginBottom: "6px" }}>First Name *</label>
              <input
                type="text"
                value={addPrincipalForm.firstName}
                onChange={(e) => setAddPrincipalForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="First name"
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
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#1E3A8A", marginBottom: "6px" }}>Last Name *</label>
              <input
                type="text"
                value={addPrincipalForm.lastName}
                onChange={(e) => setAddPrincipalForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Last name"
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
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#1E3A8A", marginBottom: "6px" }}>Email *</label>
              <input
                type="email"
                value={addPrincipalForm.email}
                onChange={(e) => setAddPrincipalForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="principal@example.com"
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
            {addPrincipalError && (
              <p style={{ color: "#DC2626", fontSize: "14px", margin: 0 }}>{addPrincipalError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowAddPrincipalModal(false)
                setNewlyRegisteredOrg(null)
                setAddPrincipalForm({ firstName: "", lastName: "", email: "" })
                setAddPrincipalError(null)
              }}
              style={{ borderColor: "#1E3A8A", color: "#1E3A8A" }}
            >
              Skip
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={handleAddPrincipalSubmit}
              disabled={addPrincipalLoading}
              style={{
                backgroundColor: addPrincipalLoading ? "#9CA3AF" : "#1E3A8A",
                color: "#FFFFFF",
                cursor: addPrincipalLoading ? "not-allowed" : "pointer",
              }}
            >
              {addPrincipalLoading ? "Adding..." : "Add Principal"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Organisation Modal */}
      <AlertDialog 
        open={showUpdateModal} 
        onOpenChange={(open) => {
          setShowUpdateModal(open)
          if (!open) {
            // Clear form when modal closes
            setUpdateFormData({
              organisationId: "",
              organisation: "",
              address: "",
              newExpiryDate: "",
              newAssignedLicenses: "",
            })
            setEditingLicense(null)
            setUpdateError(null)
          }
        }}
      >
        <AlertDialogContent style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontSize: "20px", fontWeight: "bold", color: "#1E3A8A" }}>
              Update Organisation
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 0" }}>
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
                Organisation Name
              </label>
              <input
                type="text"
                value={updateFormData.organisation}
                onChange={(e) =>
                  setUpdateFormData({ ...updateFormData, organisation: e.target.value })
                }
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
                Address
              </label>
              <textarea
                value={updateFormData.address}
                onChange={(e) =>
                  setUpdateFormData({ ...updateFormData, address: e.target.value })
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(30, 58, 138, 0.2)",
                  fontSize: "14px",
                  color: "#1E3A8A",
                  resize: "vertical",
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
                New Expiry Date
              </label>
              <input
                type="date"
                value={updateFormData.newExpiryDate}
                onChange={(e) =>
                  setUpdateFormData({ ...updateFormData, newExpiryDate: e.target.value })
                }
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
                New Assigned Licenses
              </label>
              <input
                type="number"
                value={updateFormData.newAssignedLicenses}
                onChange={(e) =>
                  setUpdateFormData({ ...updateFormData, newAssignedLicenses: e.target.value })
                }
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
            {updateError && (
              <p style={{ color: "#DC2626", fontSize: "14px", margin: 0 }}>
                {updateError}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowUpdateModal(false)
                setUpdateError(null)
                setEditingLicense(null)
                // Clear form on cancel
                setUpdateFormData({
                  organisationId: "",
                  organisation: "",
                  address: "",
                  newExpiryDate: "",
                  newAssignedLicenses: "",
                })
              }}
              style={{
                borderColor: "#1E3A8A",
                color: "#1E3A8A",
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateOrganisation}
              disabled={isUpdating}
              style={{
                backgroundColor: isUpdating ? "#9CA3AF" : "#1E3A8A",
                color: "#FFFFFF",
                cursor: isUpdating ? "not-allowed" : "pointer",
              }}
            >
              {isUpdating ? "Updating..." : "Update Organisation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Toggle Confirmation Dialog */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent style={{ backgroundColor: "#FFFFFF", borderRadius: "16px" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontSize: "20px", fontWeight: "bold", color: "#1E3A8A" }}>
              {licenseToToggle?.isActive ? "Deactivate" : "Activate"} Organisation
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)" }}>
              Are you sure you want to {licenseToToggle?.isActive ? "deactivate" : "activate"} the license for {licenseToToggle?.organization}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowStatusDialog(false)
                setLicenseToToggle(null)
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
                backgroundColor: licenseToToggle?.isActive ? "#DC2626" : "#059669",
                color: "#FFFFFF",
              }}
            >
              {licenseToToggle?.isActive ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  )
}

