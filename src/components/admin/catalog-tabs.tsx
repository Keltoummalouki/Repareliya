import { TabLinks } from "./page-header";

export function CatalogTabs({ active }: { active: "modeles" | "marques" | "categories" | "reparations" | "importer" }) {
  return (
    <TabLinks
      active={active}
      tabs={[
        { key: "modeles", label: "Modèles & tarifs", href: "/admin/appareils" },
        { key: "importer", label: "Importer des appareils", href: "/admin/appareils/importer" },
        { key: "marques", label: "Marques", href: "/admin/appareils/marques" },
        { key: "reparations", label: "Types de réparation", href: "/admin/appareils/reparations" },
        { key: "categories", label: "Catégories", href: "/admin/appareils/categories" },
      ]}
    />
  );
}
