import { apiRequest } from "./client";

/**
 * 患者标注相关的数据类型
 */
export interface Annotation {
  id: string;
  patient: string;
  patient_name: string;
  content: string;
  created_by: number;
  created_by_name: string;
  created_by_role: string;
  created_by_avatar: string | null;
  created_at: string;
  replies: Reply[];
  reply_count: number;
}

export interface Reply {
  id: string;
  annotation: string;
  content: string;
  created_by: number;
  created_by_name: string;
  created_by_role: string;
  created_by_avatar: string | null;
  created_at: string;
}

export interface CreateAnnotationData {
  patient: string;
  content: string;
}

export interface AddReplyData {
  content: string;
}

/**
 * 获取患者的所有标注
 */
export const getAnnotations = async (patientId: string): Promise<Annotation[]> => {
  const response = await apiRequest<{ results: Annotation[] }>(`/annotations/?patient=${patientId}`);
  return response.results || [];
};

/**
 * 创建患者标注
 */
export const createAnnotation = (
  data: CreateAnnotationData,
): Promise<Annotation> => {
  return apiRequest("/annotations/", {
    method: "POST",
    body: data,  // 直接传递对象，不要stringify
  });
};

/**
 * 删除患者标注
 */
export const deleteAnnotation = (id: string): Promise<void> => {
  return apiRequest(`/annotations/${id}/`, { method: "DELETE" });
};

/**
 * 为标注添加回复
 */
export const addReply = (
  annotationId: string,
  data: AddReplyData,
): Promise<Reply> => {
  return apiRequest(`/annotations/${annotationId}/add-reply/`, {
    method: "POST",
    body: data,  // 直接传递对象
  });
};
