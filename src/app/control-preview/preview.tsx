"use client";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input } from "@/components/ui/field";
import { Dialog } from "@/components/admin/dialog";
export function ControlsPreview() {
  const [value,setValue]=useState("apple"); const [date,setDate]=useState("2026-09-25"); const [modal,setModal]=useState(false); const [submitted,setSubmitted]=useState("");
  return <main className="mx-auto w-full max-w-3xl space-y-8 p-6">
    <h1 className="text-3xl font-bold">Contrôles Repareliya</h1>
    <form className="card space-y-4 p-5" onSubmit={e=>{e.preventDefault();setSubmitted(JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))));}}>
      <Field label="Catégorie" htmlFor="category"><Select id="category" name="category" defaultValue="" required><option value="">Choisir une catégorie</option><option value="smartphone">Smartphones</option><option value="tablet">Tablettes</option><option value="disabled" disabled>Indisponible</option><option value="computer">Ordinateurs</option></Select></Field>
      <Field label="Marque" htmlFor="brand"><Select id="brand" name="brand" aria-label="Marque" value={value} onChange={e=>setValue(e.target.value)} searchable>{["Apple","Samsung","Xiaomi","Redmi","Poco","Google Pixel","Huawei","Honor","Oppo","OnePlus","Motorola","Realme","Sony","Nokia"].map(n=><option key={n} value={n.toLowerCase()}>{n}</option>)}</Select></Field>
      <Field label="Date du document" htmlFor="doc-date"><DatePicker id="doc-date" name="date" value={date} onChange={e=>setDate(e.target.value)} required min="2026-09-01" max="2026-12-31" /></Field>
      <Field label="Date facultative" htmlFor="optional-date"><DatePicker id="optional-date" name="optional_date" /></Field>
      <Field label="Note" htmlFor="note"><Input id="note" name="note" /></Field>
      <p>Valeurs contrôlées : <output>{value} / {date}</output></p>
      <div className="flex gap-4"><button className="rounded-lg bg-ink px-4 py-2 text-white" type="submit">Vérifier le formulaire</button><button className="rounded-lg border px-4 py-2" type="reset">Réinitialiser</button></div>
      <output aria-label="Résultat du formulaire">{submitted}</output>
    </form>
    <button className="rounded-lg bg-brand-strong px-4 py-2 text-white" onClick={()=>setModal(true)}>Ouvrir la fenêtre</button>
    {modal ? <Dialog title="Vérification en fenêtre" onClose={()=>setModal(false)}><div className="space-y-5"><Field label="Catégorie dans la fenêtre" htmlFor="modal-select"><Select id="modal-select" defaultValue="a"><option value="a">Téléphone</option><option value="b">Tablette</option></Select></Field><Field label="Date de réalisation" htmlFor="modal-date"><DatePicker id="modal-date" defaultValue="2026-09-25" /></Field></div></Dialog>:null}
  </main>;
}
