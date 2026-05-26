export type RecipeCalculationType = 'por_m2' | 'por_unidad';

export interface RecipeLike {
  cantidad_por_m2?: number | string | null;
  tipo_calculo?: RecipeCalculationType | string | null;
  merma_pct?: number | string | null;
  factor_conversion?: number | string | null;
  maquina_factor?: number | string | null;
  unidad_base?: string | null;
  consumo_minimo?: number | string | null;
  redondeo_unidad?: number | string | null;
  maquina_id?: string | null;
  material_tipo?: string | null;
}

export interface RecipeConsumptionInput {
  quantity: number;
  baseUnits: number;
}

export function getRecipeFactor(recipe: RecipeLike, input: RecipeConsumptionInput) {
  const rate = Number(recipe.cantidad_por_m2 || 0) || 0;
  const calcType = recipe.tipo_calculo === 'por_unidad' ? 'por_unidad' : 'por_m2';
  const base = calcType === 'por_unidad' ? input.quantity : input.baseUnits;
  const conversion = Number(recipe.factor_conversion || 1) || 1;
  const machineFactor = Number(recipe.maquina_factor || 1) || 1;
  const mermaPct = Math.max(0, Number(recipe.merma_pct || 0) || 0);
  const minConsumption = Math.max(0, Number(recipe.consumo_minimo || 0) || 0);
  const roundStep = Math.max(0, Number(recipe.redondeo_unidad || 0) || 0);
  const wasteMultiplier = 1 + (mermaPct / 100);
  let consumo = rate * base * conversion * machineFactor * wasteMultiplier;
  if (minConsumption > 0) {
    consumo = Math.max(consumo, minConsumption);
  }
  if (roundStep > 0) {
    consumo = Math.ceil(consumo / roundStep) * roundStep;
  }
  return consumo;
}

export function normalizeRecipeUnit(recipe: RecipeLike, fallback = 'm2') {
  return recipe.unidad_base || fallback;
}

export function recipeAppliesToMachine(recipe: RecipeLike, machineId?: string | null) {
  if (!recipe.maquina_id) return true;
  if (!machineId) return false;
  return String(recipe.maquina_id) === String(machineId);
}

export function recipeAppliesToMaterial(recipe: RecipeLike, material?: { tipo?: string | null; nombre?: string | null } | null) {
  if (!recipe.material_tipo) return true;
  const needle = String(recipe.material_tipo).trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${material?.tipo || ''} ${material?.nombre || ''}`.toLowerCase();
  return haystack.includes(needle);
}
