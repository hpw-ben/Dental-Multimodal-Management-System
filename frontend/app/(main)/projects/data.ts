export type Member = {
  id: string
  name: string
  email: string
  avatar: string
  role: "PI" | "Researcher" | "Clinician"
}

export type Project = {
  id: string
  title: string
  description: string
  principal: Member
  status: "Active" | "Completed" | "Planning"
  patientCount: number
  createdAt: string
  members: Member[]
}

export const mockMembers: Member[] = [
  { id: "1", name: "Lemorica", email: "admin@rdms.com", avatar: "/avatars/shadcn.jpg", role: "PI" },
  { id: "2", name: "张主任", email: "zhang@hospital.com", avatar: "/avatars/02.png", role: "Clinician" },
  { id: "3", name: "王医生", email: "wang@hospital.com", avatar: "/avatars/03.png", role: "Clinician" },
  { id: "4", name: "李研究员", email: "li@lab.com", avatar: "/avatars/04.png", role: "Researcher" },
  { id: "5", name: "陈同学", email: "chen@uni.edu", avatar: "/avatars/05.png", role: "Researcher" },
]

export const mockProjects: Project[] = [
  {
    id: "PROJ-001",
    title: "口腔微生物组群研究 - 第二阶段",
    description: "针对牙周炎进展期的唾液样本与临床数据进行多模态纵向分析。",
    principal: mockMembers[0],
    status: "Active",
    patientCount: 45,
    createdAt: "2023-10-25",
    members: [mockMembers[0], mockMembers[3], mockMembers[4]],
  },
  {
    id: "PROJ-002",
    title: "儿童龋齿风险筛查计划",
    description: "基于校内筛查数据，建立儿童早期龋齿风险的多模态预测模型。",
    principal: mockMembers[1],
    status: "Active",
    patientCount: 120,
    createdAt: "2024-01-15",
    members: [mockMembers[1], mockMembers[2]],
  },
  {
    id: "PROJ-003",
    title: "种植体长期骨结合研究",
    description: "通过长期随访与影像数据，研究不同表面处理对种植体成功率的影响。",
    principal: mockMembers[2],
    status: "Planning",
    patientCount: 0,
    createdAt: "2024-03-01",
    members: [mockMembers[2], mockMembers[4]],
  },
]
