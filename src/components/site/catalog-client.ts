"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PickerCategory = { id: string; slug: string; name: string; icon: string };
export type PickerBrand = { brand_id: string; slug: string; name: string; logo_url: string | null; model_count: number };
export type PickerModel = { id: string; name: string; slug: string; release_year: number | null; is_popular: boolean };
export type PickerPrice = {
  id: string;
  repair_type_id: string;
  quality: string;
  price: number | null;
  price_is_from: boolean;
  duration: string | null;
  note: string | null;
};
export type PickerRepairType = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  category_ids: string[];
};

const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const promise = load().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, promise);
  }
  return cache.get(key) as Promise<T>;
}

export function loadBrands(categoryId: string) {
  return cached(`brands:${categoryId}`, async () => {
    const { data, error } = await createClient()
      .from("category_brands")
      .select("brand_id, slug, name, logo_url, model_count, sort_order")
      .eq("category_id", categoryId)
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return (data ?? []) as PickerBrand[];
  });
}

export function loadModels(brandId: string, categoryId: string) {
  return cached(`models:${brandId}:${categoryId}`, async () => {
    const { data, error } = await createClient()
      .from("device_models")
      .select("id, name, slug, release_year, is_popular")
      .eq("brand_id", brandId)
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .order("sort_order")
      .order("release_year", { ascending: false, nullsFirst: false })
      .order("name")
      .limit(2000);
    if (error) throw error;
    return (data ?? []) as PickerModel[];
  });
}

export function loadPrices(modelId: string) {
  return cached(`prices:${modelId}`, async () => {
    const { data, error } = await createClient()
      .from("repair_prices")
      .select("id, repair_type_id, quality, price, price_is_from, duration, note")
      .eq("model_id", modelId)
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []).map((p) => ({ ...p, price: p.price === null ? null : Number(p.price) })) as PickerPrice[];
  });
}

export function loadModelById(modelId: string) {
  return cached(`model:${modelId}`, async () => {
    const { data } = await createClient()
      .from("device_models")
      .select("id, name, slug, release_year, is_popular, brand_id, category_id, brands(name, slug)")
      .eq("id", modelId)
      .maybeSingle();
    return data;
  });
}

/** Charge une ressource asynchrone quand la clé change ; null = rien à charger. */
export function useAsync<T>(key: string | null, load: () => Promise<T>) {
  const [state, setState] = useState<{ key: string | null; data: T | null; error: boolean }>({
    key: null,
    data: null,
    error: false,
  });

  useEffect(() => {
    if (!key) return;
    let active = true;
    load()
      .then((data) => active && setState({ key, data, error: false }))
      .catch(() => active && setState({ key, data: null, error: true }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const ready = key !== null && state.key === key;
  return { data: ready ? state.data : null, loading: key !== null && !ready, error: ready && state.error };
}
