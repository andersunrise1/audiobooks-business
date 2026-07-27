import {
  getVariantName,
  getVariantConfig,
  logExposure,
  logConversion,
} from '../services/experimentService.js';

export async function getAssignment(req, res) {
  const { name } = req.params;
  const { subjectId } = req.query;

  if (!subjectId) {
    return res.status(400).json({ error: 'subjectId is required' });
  }

  const variant = getVariantName(name, subjectId);
  if (!variant) {
    return res.status(404).json({ error: 'unknown experiment' });
  }

  await logExposure(name, subjectId, variant);

  res.json({ experiment: name, variant, config: getVariantConfig(name, variant) });
}

export async function postConversion(req, res) {
  const { name } = req.params;
  const { subjectId, variant, metadata } = req.body;

  if (!subjectId || !variant) {
    return res.status(400).json({ error: 'subjectId and variant are required' });
  }

  if (!getVariantConfig(name, variant)) {
    return res.status(404).json({ error: 'unknown experiment or variant' });
  }

  await logConversion(name, subjectId, variant, metadata ?? null);
  res.status(201).json({ recorded: true });
}
