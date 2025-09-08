export enum AmountRoundingOff {
  NearestHalfOrOne = "NEAREST_HALF_OR_ONE",
  RoundUp = "ROUND_UP",
  NearestOne = "NEAREST_ONE",
  RoundDown = "ROUND_DOWN",
}

export enum TaxCalculationMode {
  MonthlyFromJoinMonth = "MONTHLY_FROM_JOIN_MONTH",
  MonthlyAvgByFirstPayslipMonthCount = "MONTHLY_AVG_BY_FIRST_PAYSLIP_MONTH_COUNT",
  AlwaysAvgFor12 = "ALWAYS_AVG_FOR_12",
}

export enum PayrollDaysMode {
  ActualDaysInMonth = "ACTUAL_DAYS_IN_MONTH",
  ThirtyDaysEveryMonth = "THIRTY_DAYS_EVERY_MONTH",
  ThirtyOneDaysEveryMonth = "THIRTY_ONE_DAYS_EVERY_MONTH",
}

export enum EsicWagesMode {
  OnCTC = "ON_CTC",
  OnGross = "ON_GROSS",
  OnNet = "ON_NET",
}

export interface MonthlyInvestmentWindow {
  fromDay: number;
  toDay: number;
}

export interface PoiWindow {
  from: string;
  to: string;
}

export interface PayrollConfiguration {
  amountRoundingOff: AmountRoundingOff;
  taxCalculationMode: TaxCalculationMode;
  payrollDaysMode: PayrollDaysMode;
  esicWagesMode: EsicWagesMode;

  investmentWindowMonthly: MonthlyInvestmentWindow;
  poiWindowFY: PoiWindow;

  updatedBy: string;
  updatedAt: string;
  createdAt?: string;
}
