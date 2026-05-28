"use client"

import { useParams } from "next/navigation"
import { PatientDetailContent } from "@/components/patient/patient-detail-content"

export default function PatientDetailPage() {
  const params = useParams()
  const patientId = params.id as string

  return <PatientDetailContent patientId={patientId} />
}
