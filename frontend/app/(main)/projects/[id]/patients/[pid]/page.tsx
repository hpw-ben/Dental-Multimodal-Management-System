"use client"

import { useParams } from "next/navigation"
import { PatientDetailContent } from "@/components/patient/patient-detail-content"

export default function ProjectPatientDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const patientId = params.pid as string

  return <PatientDetailContent patientId={patientId} projectId={projectId} />
}
