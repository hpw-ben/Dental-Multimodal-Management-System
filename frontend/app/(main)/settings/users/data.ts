export type UserRole = "Admin" | "Researcher" | "Doctor"
export type UserStatus = "Active" | "Inactive"

export type User = {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  status: UserStatus
  createdAt: string
  lastLogin?: string
  isActivated: boolean
  activationToken?: string
  activationTokenExpiry?: string
}

export const mockUsers: User[] = [
  {
    id: "1",
    name: "Lemorica",
    email: "admin@rdms.com",
    avatar: "/avatars/shadcn.jpg",
    role: "Admin",
    status: "Active",
    createdAt: "2023-01-01",
    lastLogin: "2024-10-30",
    isActivated: true,
  },
  {
    id: "2",
    name: "张主任",
    email: "zhang@hospital.com",
    avatar: "/avatars/02.png",
    role: "Researcher",
    status: "Active",
    createdAt: "2023-06-15",
    lastLogin: "2024-10-29",
    isActivated: true,
  },
  {
    id: "3",
    name: "王医生",
    email: "wang@hospital.com",
    avatar: "/avatars/03.png",
    role: "Doctor",
    status: "Active",
    createdAt: "2023-08-20",
    lastLogin: "2024-10-28",
    isActivated: true,
  },
  {
    id: "4",
    name: "李研究员",
    email: "li@lab.com",
    avatar: "/avatars/04.png",
    role: "Researcher",
    status: "Active",
    createdAt: "2024-01-10",
    lastLogin: "2024-10-27",
    isActivated: true,
  },
  {
    id: "5",
    name: "陈同学",
    email: "chen@uni.edu",
    avatar: "/avatars/05.png",
    role: "Researcher",
    status: "Inactive",
    createdAt: "2024-03-05",
    lastLogin: "2024-09-15",
    isActivated: true,
  },
]
