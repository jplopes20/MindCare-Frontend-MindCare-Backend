const STORAGE_KEY = 'mindcare:store_v1'

function defaultData(){
  return {
    currentUser: null,
    patients: [
      { id: 'p1', name: 'João Silva', dob: '1990-03-12', documents: [{id:'d1',name:'Exame de sangue.pdf'}], ehr:{anamnese:'Paciente relata ansiedade intermitente',diagnosticos:'F41.1',prescricoes:'',evolucao:''} },
      { id: 'p2', name: 'Maria Oliveira', dob: '1985-08-22', documents: [], ehr:{anamnese:'Queixas de insônia',diagnosticos:'F51.0',prescricoes:'',evolucao:''} }
    ],
    appointments: [
      { id: 'a1', patientId: 'p1', professional: 'Dra. Silva', datetime: new Date().toISOString(), type: 'Psicoterapia' },
      { id: 'a2', patientId: 'p2', professional: 'Dr. Costa', datetime: new Date(Date.now()+86400000).toISOString(), type: 'Avaliação' }
    ]
  }
}

function read(){
  const raw = localStorage.getItem(STORAGE_KEY)
  if(!raw) {
    const d = defaultData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
    return d
  }
  try{ return JSON.parse(raw) }catch(e){ const d=defaultData(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); return d }
}

function write(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function initMock(){
  read()
}

export function loginAs(user){
  const s = read()
  s.currentUser = user
  write(s)
}

export function logout(){
  const s = read()
  s.currentUser = null
  write(s)
}

export function getCurrentUser(){
  return read().currentUser
}

export function getPatients(){
  return read().patients
}

export function getPatient(id){
  return read().patients.find(p=>p.id===id)
}

export function addPatient(patient){
  const s = read()
  s.patients.push(patient)
  write(s)
}

export function updatePatient(patientId, updates){
  const s = read()
  const p = s.patients.find(x=>x.id===patientId)
  if(!p) return false
  Object.assign(p, updates)
  write(s)
  return true
}

export function getDocuments(patientId){
  const p = getPatient(patientId)
  return p? (p.documents||[]) : []
}

export function addDocument(patientId, doc){
  const s = read()
  const p = s.patients.find(x=>x.id===patientId)
  if(!p) return false
  p.documents = p.documents || []
  p.documents.push(doc)
  write(s)
  return true
}

export function getAppointments(){
  return read().appointments
}

export function addAppointment(appt){
  const s = read()
  s.appointments.push(appt)
  write(s)
}

export function saveEHR(patientId, ehr){
  const s = read()
  const p = s.patients.find(x=>x.id===patientId)
  if(p){ p.ehr = {...p.ehr, ...ehr}; write(s); return true }
  return false
}

export function getEHR(patientId){
  const p = getPatient(patientId)
  return p? p.ehr : null
}

export default { initMock, loginAs, logout, getCurrentUser, getPatients, getPatient, addPatient, getAppointments, addAppointment, saveEHR, getEHR }
