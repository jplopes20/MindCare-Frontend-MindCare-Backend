import { request } from './api.js'

export async function getMyDocuments() {
  return request('/api/documents/me')
}

export async function getPatientDocuments(patientId) {
  return request(`/api/documents/patient/${patientId}`)
}

export async function getDocument(id) {
  return request(`/api/documents/${id}`)
}

export async function uploadDocument(formData) {
  return request('/api/documents/upload', {
    method: 'POST',
    body: formData,
    formData: true,
  })
}

export async function deleteDocument(id) {
  return request(`/api/documents/${id}`, {
    method: 'DELETE',
  })
}

export async function toggleDocumentArchive(id, isArchived) {
  return request(`/api/documents/${id}/archive`, {
    method: 'PATCH',
    body: { isArchived },
  })
}

export async function uploadFromUrl(url, title, documentType, description, patientId) {
  return request('/api/documents/upload-from-url', {
    method: 'POST',
    body: { url, title, documentType, description, patientId },
  })
}

export async function uploadFromDrive(googleFileId, googleFileName, googleMimeType, title, documentType, description, patientId) {
  return request('/api/documents/upload-from-drive', {
    method: 'POST',
    body: { googleFileId, googleFileName, googleMimeType, title, documentType, description, patientId },
  })
}

export default {
  getMyDocuments,
  getPatientDocuments,
  getDocument,
  uploadDocument,
  uploadFromUrl,
  uploadFromDrive,
  deleteDocument,
  toggleDocumentArchive,
}
