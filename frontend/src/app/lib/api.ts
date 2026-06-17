import { API_BASE } from "./config"

export async function uploadDataset(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch(`${API_BASE}/dataset/upload`, {
    method: "POST",
    body: formData
  })

  return res.json()
}

export async function analyzeDataset(filePath: string) {
  const res = await fetch(`${API_BASE}/analyze?file_path=${filePath}`)
  return res.json()
}

export async function uploadDocument(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch(`${API_BASE}/upload/`, {
    method: "POST",
    body: formData
  })

  return res.json()
}

export async function queryDocument(data: {
  question: string
  file_name: string
  session_id: string
}) {
  const res = await fetch(`${API_BASE}/documents/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })

  return res.text()
}

export async function chatWithDocument(data: {
  question: string
  file_name: string
  session_id: string
}) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })

  return res.json()
}