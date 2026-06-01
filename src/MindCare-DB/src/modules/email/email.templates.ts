export function confirmationHtml(opts: {
  patientName: string
  professionalName: string
  specialty: string
  dateTime: string
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="padding:32px 32px 24px;background:#1a73e8;text-align:center">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">MindCare</h1>
<p style="margin:6px 0 0;color:#ffffffcc;font-size:14px">Plataforma de Sa\u00fade Mental</p>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 20px;color:#1a1a2e;font-size:20px">Consulta Confirmada</h2>
<p style="margin:0 0 6px;color:#333;font-size:15px">Ol\u00e1 <strong>${opts.patientName}</strong>,</p>
<p style="margin:0 0 20px;color:#555;font-size:14px">Sua consulta foi agendada com sucesso.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border-radius:6px;padding:16px;margin-bottom:20px">
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Profissional</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px"><strong>${opts.professionalName}</strong></td></tr>
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Especialidade</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px">${opts.specialty}</td></tr>
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Data e Hor\u00e1rio</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px"><strong>${opts.dateTime}</strong></td></tr>
</table>
<p style="margin:0;color:#888;font-size:12px">Acesse a plataforma para mais detalhes ou cancelamento.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f4f6f9;text-align:center;font-size:12px;color:#999">
MindCare — Plataforma de Sa\u00fade Mental
</td></tr>
</table>
</td></tr></table>
</body></html>`
}

export function reminderHtml(opts: {
  patientName: string
  professionalName: string
  specialty: string
  dateTime: string
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="padding:32px 32px 24px;background:#e8a917;text-align:center">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">MindCare</h1>
<p style="margin:6px 0 0;color:#ffffffcc;font-size:14px">Plataforma de Sa\u00fade Mental</p>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 20px;color:#1a1a2e;font-size:20px">Lembrete de Consulta</h2>
<p style="margin:0 0 6px;color:#333;font-size:15px">Ol\u00e1 <strong>${opts.patientName}</strong>,</p>
<p style="margin:0 0 20px;color:#555;font-size:14px">Voc\u00ea tem uma consulta marcada em breve.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border-radius:6px;padding:16px;margin-bottom:20px">
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Profissional</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px"><strong>${opts.professionalName}</strong></td></tr>
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Especialidade</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px">${opts.specialty}</td></tr>
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Data e Hor\u00e1rio</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px"><strong>${opts.dateTime}</strong></td></tr>
</table>
<p style="margin:0;color:#888;font-size:12px">N\u00e3o se atrase. Em caso de imprevisto, cancele com anteced\u00eancia.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f4f6f9;text-align:center;font-size:12px;color:#999">
MindCare — Plataforma de Sa\u00fade Mental
</td></tr>
</table>
</td></tr></table>
</body></html>`
}

export function requestHtml(opts: {
  professionalName: string
  patientName: string
  dateTime: string
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="padding:32px 32px 24px;background:#e8a917;text-align:center">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">MindCare</h1>
<p style="margin:6px 0 0;color:#ffffffcc;font-size:14px">Plataforma de Sa\u00fade Mental</p>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 20px;color:#1a1a2e;font-size:20px">Nova Solicita\u00e7\u00e3o de Consulta</h2>
<p style="margin:0 0 6px;color:#333;font-size:15px">Ol\u00e1 <strong>${opts.professionalName}</strong>,</p>
<p style="margin:0 0 20px;color:#555;font-size:14px">Voc\u00ea recebeu uma nova solicita\u00e7\u00e3o de consulta.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border-radius:6px;padding:16px;margin-bottom:20px">
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Paciente</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px"><strong>${opts.patientName}</strong></td></tr>
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Data e Hor\u00e1rio</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px"><strong>${opts.dateTime}</strong></td></tr>
</table>
<p style="margin:0;color:#888;font-size:12px">Acesse a plataforma para confirmar ou sugerir um novo hor\u00e1rio.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f4f6f9;text-align:center;font-size:12px;color:#999">
MindCare — Plataforma de Sa\u00fade Mental
</td></tr>
</table>
</td></tr></table>
</body></html>`
}

export function rescheduleProposalHtml(opts: {
  patientName: string
  professionalName: string
  dateTime: string
  message: string
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="padding:32px 32px 24px;background:#ff8a3d;text-align:center">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">MindCare</h1>
<p style="margin:6px 0 0;color:#ffffffcc;font-size:14px">Plataforma de Sa\u00fade Mental</p>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 20px;color:#1a1a2e;font-size:20px">Proposta de Reagendamento</h2>
<p style="margin:0 0 6px;color:#333;font-size:15px">Ol\u00e1 <strong>${opts.patientName}</strong>,</p>
<p style="margin:0 0 20px;color:#555;font-size:14px">O profissional sugeriu um novo hor\u00e1rio para sua consulta.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border-radius:6px;padding:16px;margin-bottom:20px">
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Profissional</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px"><strong>${opts.professionalName}</strong></td></tr>
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Novo Hor\u00e1rio</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px"><strong>${opts.dateTime}</strong></td></tr>
${opts.message ? `<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Mensagem</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px">${opts.message}</td></tr>` : ''}
</table>
<p style="margin:0;color:#888;font-size:12px">Acesse a plataforma para aceitar ou recusar a proposta.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f4f6f9;text-align:center;font-size:12px;color:#999">
MindCare — Plataforma de Sa\u00fade Mental
</td></tr>
</table>
</td></tr></table>
</body></html>`
}

export function cancellationHtml(opts: {
  patientName: string
  professionalName: string
  dateTime: string
  reason: string
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="padding:32px 32px 24px;background:#d93025;text-align:center">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">MindCare</h1>
<p style="margin:6px 0 0;color:#ffffffcc;font-size:14px">Plataforma de Sa\u00fade Mental</p>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 20px;color:#1a1a2e;font-size:20px">Consulta Cancelada</h2>
<p style="margin:0 0 6px;color:#333;font-size:15px">Ol\u00e1 <strong>${opts.patientName}</strong>,</p>
<p style="margin:0 0 20px;color:#555;font-size:14px">Sua consulta foi cancelada conforme detalhes abaixo.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border-radius:6px;padding:16px;margin-bottom:20px">
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Profissional</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px"><strong>${opts.professionalName}</strong></td></tr>
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Data Original</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px">${opts.dateTime}</td></tr>
<tr><td style="padding:4px 0"><span style="color:#888;font-size:13px">Motivo</span></td><td style="padding:4px 0;color:#1a1a2e;font-size:14px">${opts.reason}</td></tr>
</table>
<p style="margin:0;color:#888;font-size:12px">Caso deseje, agende uma nova consulta pela plataforma.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f4f6f9;text-align:center;font-size:12px;color:#999">
MindCare — Plataforma de Sa\u00fade Mental
</td></tr>
</table>
</td></tr></table>
</body></html>`
}
