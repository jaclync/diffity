import { createHash } from 'crypto';
import { existsSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readSkills, renderSkill, writeFile, cleanDir } from './lib/utils.js';
import { claudeCode } from './lib/transformers/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const sourceDir = join(rootDir, 'packages', 'skills');
const outputDir = join(rootDir, 'skills');
const homeDir = process.env.HOME || process.env.USERPROFILE || '';
const globalClaudeSkillsDir = join(homeDir, '.claude', 'skills');

const skills = readSkills(sourceDir);
console.log(`Found ${skills.length} skills`);

cleanDir(outputDir);
const renderedSkills: string[] = [];
for (const skill of skills) {
  const content = renderSkill(skill, { binary: 'diffity' });
  writeFile(join(outputDir, skill.name, 'SKILL.md'), content);
  renderedSkills.push(content);
}
console.log(`Built ${skills.length} skills to skills/`);

const skillsHash = createHash('sha256').update(renderedSkills.sort().join('')).digest('hex').slice(0, 12);
writeFile(
  join(rootDir, 'packages', 'cli', 'src', 'generated', 'skills-hash.ts'),
  `export const SKILLS_HASH = '${skillsHash}';\n`,
);
console.log(`Skills hash: ${skillsHash}`);

// Only remove our own diffity-dev-* entries — never wipe the whole directory,
// which may contain the user's unrelated skills.
if (existsSync(globalClaudeSkillsDir)) {
  for (const entry of readdirSync(globalClaudeSkillsDir)) {
    if (entry.startsWith('diffity-dev-')) {
      rmSync(join(globalClaudeSkillsDir, entry), { recursive: true, force: true });
    }
  }
}
// Only sync dev skills for contributors who have linked the dev binary
// (via npm run dev) — a plain `npm run build` shouldn't touch user skills.
const devBinaryLinked = existsSync(join(rootDir, '.bin', 'diffity-dev'));
if (devBinaryLinked) {
  for (const skill of skills) {
    claudeCode(skill, homeDir, { binary: 'diffity-dev', namePrefix: 'diffity-dev', slashPrefix: '/diffity-dev-', installHint: 'run `npm run dev` from the diffity repo root to link the CLI' });
  }
  console.log(`Synced ${skills.length} dev skills to ~/.claude/skills/`);
} else {
  console.log('Skipped dev skills sync (diffity-dev not linked; run `npm run dev` to enable)');
}
