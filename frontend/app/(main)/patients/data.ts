export type Patient = {
  id: string
  caseNumber: string
  name: string
  gender: "Male" | "Female"
  birthDate: string // YYYY-MM-DD

  createdAt: string
  diagnosis: string
  lastVisit: string
  status: "已确认" | "待确认"
  completenessScore?: number  // 新增：完整度评分 0-100
}

export const mockPatients: Patient[] = [
  {
    id: "1",
    caseNumber: "20240101",
    name: "李若彤",
    gender: "Female",
    birthDate: "1995-05-20",

    createdAt: "2024-01-15",
    diagnosis: "慢性牙周炎",
    lastVisit: "2024-10-25",
    status: "已确认",
  },
  {
    id: "2",
    caseNumber: "20240102",
    name: "王强",
    gender: "Male",
    birthDate: "1980-11-12",

    createdAt: "2024-02-10",
    diagnosis: "深龋 (36, 46)",
    lastVisit: "2024-10-22",
    status: "已确认",
  },
  {
    id: "3",
    caseNumber: "20240105",
    name: "陈薇",
    gender: "Female",
    birthDate: "2012-06-01",

    createdAt: "2024-03-05",
    diagnosis: "错颌畸形",
    lastVisit: "2024-09-15",
    status: "待确认",
  },
  {
    id: "4",
    caseNumber: "20240212",
    name: "赵铁柱",
    gender: "Male",
    birthDate: "1968-03-15",

    createdAt: "2024-03-12",
    diagnosis: "牙列缺损",
    lastVisit: "2024-10-26",
    status: "已确认",
  },
  {
    id: "5",
    caseNumber: "20240301",
    name: "刘星",
    gender: "Male",
    birthDate: "2005-08-20",

    createdAt: "2024-04-01",
    diagnosis: "阻生智齿",
    lastVisit: "2024-10-21",
    status: "待确认",
  },
  ...Array.from({ length: 15 }).map((_, i) => ({
    id: (i + 6).toString(),
    caseNumber: `20240${310 + i}`,
    name: `测试患者${i + 6}`,
    gender: i % 2 === 0 ? "Male" : "Female" as "Male" | "Female",
    birthDate: "1990-01-01",
    createdAt: "2024-05-01",
    diagnosis: "常规检查",
    lastVisit: "2024-10-20",
    status: "待确认" as "已确认" | "待确认",
  })),
]
