/**
 * The cheap gate in front of the model. Most of the Updates tab is receipts, newsletters and security notices;
 * paying for an AI call on each would be wasteful. Looks only at sender, subject and Gmail's snippet.
 * It errs towards letting borderline mail through: the model makes the final call.
 */
import type { MessageMeta } from './messages';

/** Applicant tracking systems and job boards that send application mail. Matched as a domain suffix. */
export const ATS_DOMAINS: Record<string, string> = {
  'greenhouse.io': 'greenhouse', 'greenhouse-mail.io': 'greenhouse', 'lever.co': 'lever', 'hire.lever.co': 'lever',
  'myworkday.com': 'workday', 'workday.com': 'workday', 'myworkdayjobs.com': 'workday', 'ashbyhq.com': 'ashby',
  'smartrecruiters.com': 'smartrecruiters', 'icims.com': 'icims', 'jobvite.com': 'jobvite', 'taleo.net': 'taleo',
  'successfactors.com': 'successfactors', 'successfactors.eu': 'successfactors', 'bamboohr.com': 'bamboohr',
  'workable.com': 'workable', 'recruitee.com': 'recruitee', 'breezy.hr': 'breezy', 'teamtailor.com': 'teamtailor',
  'pinpointhq.com': 'pinpoint', 'jazzhr.com': 'jazzhr', 'applytojob.com': 'jazzhr', 'oraclecloud.com': 'oracle',
  'linkedin.com': 'linkedin', 'indeed.com': 'indeed', 'indeedapply.com': 'indeed', 'naukri.com': 'naukri',
  'wellfound.com': 'wellfound', 'angel.co': 'wellfound', 'glassdoor.com': 'glassdoor', 'ziprecruiter.com': 'ziprecruiter',
  'instahyre.com': 'instahyre', 'foundit.in': 'foundit', 'monster.com': 'monster', 'hirist.tech': 'hirist', 'cutshort.io': 'cutshort',
};

const APPLICATION = /\b(your application|you applied|applied (for|to)|application (received|submitted|status|update|was sent)|thank(s| you) for (applying|your interest|your application)|interview|assessment|coding (challenge|test)|online test|take-?home|next steps|offer (letter|of employment)|we('| a)?re pleased to offer|unfortunately|not (be )?moving forward|move forward with other|regret to inform|candidate|recruiter|hiring (team|manager)|position|opening|application for)\b/i;
const ALERT = /\b(jobs? (for you|alert|recommendations?|you may like|matching)|new jobs?|recommended jobs?|similar jobs?|jobs? near|top jobs?|weekly digest|job picks|hiring now|\d+\+? (new )?jobs?)\b/i;
const NOT_JOB = /\b(receipt|invoice|order (confirmation|#)|your order|shipping|delivered|password|verification code|security alert|sign-?in|bank|statement|payment|subscription|newsletter|webinar|unsubscribe)\b/i;

export interface PrefilterResult {
  candidate: boolean;
  reason: string;
  /** Short board/ATS label from the sender, e.g. "greenhouse". */
  board: string | null;
}

export function boardFor(domain: string): string | null {
  const d = domain.toLowerCase();
  for (const [suffix, label] of Object.entries(ATS_DOMAINS)) if (d === suffix || d.endsWith(`.${suffix}`)) return label;
  return null;
}

export function prefilter(meta: Pick<MessageMeta, 'fromDomain' | 'subject' | 'snippet'>): PrefilterResult {
  const board = boardFor(meta.fromDomain);
  const text = `${meta.subject}\n${meta.snippet}`;
  const application = APPLICATION.test(text);

  // A digest of recommended jobs is not an application, even from a job board.
  if (ALERT.test(meta.subject) && !/\b(your application|you applied|interview|assessment|unfortunately|offer)\b/i.test(meta.subject)) {
    return { candidate: false, reason: 'job alert digest', board };
  }
  if (board && application) return { candidate: true, reason: 'job board or ATS sender with application wording', board };
  if (board) return { candidate: true, reason: 'job board or ATS sender', board };
  if (NOT_JOB.test(meta.subject) && !application) return { candidate: false, reason: 'receipt, security or marketing mail', board };
  if (application) return { candidate: true, reason: 'application wording', board };
  return { candidate: false, reason: 'no job signals', board };
}
