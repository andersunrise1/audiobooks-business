import { EXPERIMENTS, getExperimentResults } from '../services/experimentService.js';

export function listExperiments(req, res) {
  const experiments = Object.entries(EXPERIMENTS).map(([name, config]) => ({
    name,
    variants: Object.keys(config.variants),
  }));
  res.json(experiments);
}

export async function getResults(req, res) {
  const { name } = req.params;

  if (!EXPERIMENTS[name]) {
    return res.status(404).json({ error: 'unknown experiment' });
  }

  const results = await getExperimentResults(name);
  res.json({ experiment: name, results });
}
