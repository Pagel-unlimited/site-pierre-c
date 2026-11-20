// Reçoit les demandes du formulaire de contact et les envoie par e-mail via Gmail.
// À régler dans Vercel (Settings > Environment Variables), jamais dans ce fichier :
//   GMAIL_USER          l'adresse Gmail qui envoie et reçoit les demandes
//   GMAIL_APP_PASSWORD  un « mot de passe d'application » Google (pas le mot de passe du compte)
import nodemailer from "nodemailer";

const CHAMPS = [
  ["demande", "Demande"],
  ["evenement", "Événement"],
  ["nom", "Nom"],
  ["mail", "E-mail"],
  ["tel", "Téléphone"],
  ["date", "Date"],
  ["lieu", "Lieu"],
  ["invites", "Nombre de personnes"],
  ["message", "Message"],
];

const nettoyer = (v, max = 2000) => String(v ?? "").replace(/[\r\n]+/g, (m) => (max > 200 ? "\n" : " ")).trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }
  const d = typeof req.body === "object" && req.body ? req.body : {};

  // Piège à robots : ce champ est invisible pour les visiteurs
  if (d.site_web) return res.status(200).json({ ok: true });

  const v = Object.fromEntries(CHAMPS.map(([k]) => [k, nettoyer(d[k], k === "message" ? 4000 : 200)]));
  if (!v.nom || !v.tel || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.mail)) {
    return res.status(400).json({ ok: false, erreur: "Champs obligatoires manquants." });
  }

  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return res.status(500).json({ ok: false, erreur: "Envoi non configuré." });
  }

  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  try {
    await transport.sendMail({
      from: `"Site Pierre C" <${GMAIL_USER}>`,
      to: GMAIL_USER,
      replyTo: v.mail,
      subject: `${v.demande || "Demande"} (${v.evenement || "?"}) : ${v.nom}`,
      text: CHAMPS.filter(([k]) => v[k]).map(([k, l]) => `${l} : ${v[k]}`).join("\n"),
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Envoi du formulaire impossible", e);
    return res.status(502).json({ ok: false });
  }
}
