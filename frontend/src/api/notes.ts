import client from './client'
import type { NoteItem } from '../types/billing'

export async function fetchNotes(year: number, month: number, profile?: string): Promise<NoteItem[]> {
  const { data } = await client.get(`/notes/${year}/${month}`, {
    params: { profile: profile || 'default' },
  })
  return data.data
}

export async function fetchNotesByRange(fromDate: string, toDate: string, profile?: string): Promise<NoteItem[]> {
  const { data } = await client.get('/notes', {
    params: { from_date: fromDate, to_date: toDate, profile: profile || 'default' },
  })
  return data.data
}

export async function upsertNote(payload: {
  year: number
  month: number
  service_name: string
  note: string
  note_date: string
  resource_id?: string | null
  resource_name?: string | null
  filter_name?: string | null
  aws_profile?: string
}): Promise<NoteItem> {
  const { data } = await client.post('/notes', payload)
  return data
}

export async function deleteNote(id: number): Promise<void> {
  await client.delete(`/notes/${id}`)
}
