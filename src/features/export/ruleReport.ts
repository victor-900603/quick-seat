import type { Project, Rule, RuleViolation } from '../../types/domain'
import { getSeatRefs } from '../classroom/numbering'
import { evaluateAssignment } from '../rules/evaluateRules'
import { formatRuleSummary, RULE_TYPE_LABELS } from '../rules/ruleOps'
import { isAssignmentStale } from '../seating/revision'

export interface ExportRuleReportRow {
  ruleId: string
  type: Rule['type']
  typeLabel: string
  summary: string
  strength: Rule['strength']
  weight: number
  enabled: boolean
  status: string
  violationCount: number
  seatCodes: string[]
  personNames: string[]
  note: string
}

export interface ExportRuleReport {
  rows: ExportRuleReportRow[]
  totalRules: number
  enabledRules: number
  violationCount: number
  hardViolationCount: number
  softCost: number
  stale: boolean
  timedOut: boolean
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function violationSeats(
  violations: RuleViolation[],
  seatCodes: Map<string, string>,
): string[] {
  return unique(
    violations.flatMap((violation) =>
      violation.seatIds.map((seatId) => seatCodes.get(seatId) ?? seatId),
    ),
  )
}

function violationPersons(
  violations: RuleViolation[],
  personNames: Map<string, string>,
): string[] {
  return unique(
    violations.flatMap((violation) =>
      violation.personIds.map(
        (personId) => personNames.get(personId) ?? personId,
      ),
    ),
  )
}

export function buildRuleReport(project: Project): ExportRuleReport {
  const assignment = project.currentAssignment
  const evaluation = assignment
    ? evaluateAssignment(project, assignment)
    : null
  const seatCodes = new Map(
    getSeatRefs(project.classroom).map((seat) => [seat.id, seat.code]),
  )
  const personNames = new Map(
    project.roster.persons.map((person) => [person.id, person.name]),
  )
  const rows = project.rules.map((rule): ExportRuleReportRow => {
    const violations =
      evaluation?.violations.filter(
        (violation) => violation.ruleId === rule.id,
      ) ?? []

    return {
      ruleId: rule.id,
      type: rule.type,
      typeLabel: RULE_TYPE_LABELS[rule.type],
      summary: formatRuleSummary(rule, project),
      strength: rule.strength,
      weight: rule.weight,
      enabled: rule.enabled,
      status: !rule.enabled
        ? '已停用'
        : violations.length > 0
          ? `${violations.length} 個衝突`
          : assignment
            ? '符合'
            : '尚未排座',
      violationCount: violations.length,
      seatCodes: violationSeats(violations, seatCodes),
      personNames: violationPersons(violations, personNames),
      note: rule.note,
    }
  })

  return {
    rows,
    totalRules: project.rules.length,
    enabledRules: project.rules.filter((rule) => rule.enabled).length,
    violationCount: evaluation?.violationCount ?? 0,
    hardViolationCount: evaluation?.hardViolationCount ?? 0,
    softCost: evaluation?.softCost ?? 0,
    stale: isAssignmentStale(project),
    timedOut: assignment?.timedOut ?? false,
  }
}
