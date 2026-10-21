// The JSON source: imported with the bundle and validated once at startup (contracts/data-contract.md).
import raw from '../../public/data/eppcc.v1.json';
import type { PortfolioDataset } from '../domain/types';
import { validateDataset } from '../domain/validate';

export type DatasetResult = { ok: true; dataset: PortfolioDataset } | { ok: false; errors: string[] };

export function loadDataset(source: unknown = raw): DatasetResult {
  const errors = validateDataset(source);
  return errors.length ? { ok: false, errors } : { ok: true, dataset: source as PortfolioDataset };
}