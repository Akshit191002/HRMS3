import { z } from 'zod';
import { AccountType } from '../employees/employee.bankDetails';
import { Gender, MaritalStatus, Status, Title } from '../employees/employee.general';

const AccountTypeEnum = z.enum(["Saving", "Current", "saving", "current"]);
export const GenderEnum = z.nativeEnum(Gender)
// export const GenderEnum = z.enum(["Male", "Female"]);
// export const TitleEnum = z.enum(["MR", "MRS", "MS"]);
export const TitleEnum = z.nativeEnum(Title).transform(val => val.toUpperCase() as Title);
export const ChangeStatus = z.enum(["Active", "Inactive", "active", "inactive"]);

export const StatusEnum = z.nativeEnum(Status);

export const MaritalStatusEnum = z.nativeEnum(MaritalStatus);


export const NameSchema = z.object({
  first: z.string()
    .min(2, "First name must be at least 2 characters long")
    .regex(/^[A-Za-z\s]+$/, "First name can only contain letters and spaces")
    .optional(),
  last: z.string()
    .min(2, "Last name must be at least 2 characters long")
    .regex(/^[A-Za-z\s]+$/, "Last name can only contain letters and spaces")
    .optional(),
});


export const PhoneSchema = z.object({
  code: z.string(),
  num: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
});

export const AddressSchema = z.object({
  line1: z.string(),
  line2: z.string().nullable().optional(),
  city: z.string(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().optional()
});

export const LoginDetailsSchema = z.object({
  username: z.string(),
  password: z.string(),
  loignEnable: z.boolean(),
  accLocked: z.boolean()
});

// export const CreateEmployeeSchema = z.object({
//   title: TitleEnum,
//   firstName: z.string().min(1, "First name is required"),
//   lastName: z.string().optional(),
//   email: z.string().email(),
//   gender: GenderEnum,
//   phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
//   joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
//   department: z.string(),
//   designation: z.string(),
//   role: z.string(),
//   location: z.string().optional(),
//   reportingManager: z.string().optional(),
//   workingPattern: z.string().optional(),
//   holidayGroup: z.string().optional(),
//   ctc: z.string().min(4, "ctc at least 4 digits"),
//   payslipComponent: z.any().optional(),
//   leaveType: z.string().optional()
// });

export const CreateEmployeeSchema = z.object({
  title: TitleEnum,

  firstName: z.string()
    .min(1, "First name is required")
    .regex(/^[A-Za-z\s]+$/, "First name must contain only letters and spaces"),

  lastName: z.string()
    .regex(/^[A-Za-z\s]+$/, "Last name must contain only letters and spaces")
    .optional(),

  email: z.string()
    .email("Invalid email format"),

  gender: GenderEnum,

  phone: z.string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),

  joiningDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),

  department: z.string()
    .min(1, "Department is required")
    .regex(/^[A-Za-z\s]+$/, "Department must contain only letters and spaces"),

  designation: z.string()
    .min(1, "Designation is required")
    .regex(/^[A-Za-z\s]+$/, "Designation must contain only letters and spaces"),

  role: z.string()
    .min(1, "Role is required")
    .regex(/^[A-Za-z\s]+$/, "Role must contain only letters and spaces"),

  location: z.string()
    .regex(/^[A-Za-z\s]+$/, "Location must contain only letters and spaces"),

  reportingManager: z.string()
    .regex(/^[A-Za-z\s]+$/, "Reporting Manager name must contain only letters and spaces"),

  workingPattern: z.string()
    .regex(/^[A-Za-z\s]+$/, "Working pattern must contain only letters and spaces"),

  holidayGroup: z.string()
    .regex(/^[A-Za-z\s]+$/, "Holiday group must contain only letters and spaces"),

  ctc: z.string()
    .regex(/^\d+$/, "CTC must be numeric")
    .min(5, "CTC must be at least 5 digits"),

  payslipComponent: z.any().optional(),

  leaveType: z.string()
    .regex(/^[A-Za-z\s]+$/, "Leave type must contain only letters and spaces")
});


export const BankDetailsSchema = z.object({
  bankName: z.string()
    .min(1, "Bank name is required")
    .regex(/^[A-Za-z\s]+$/, "Bank name must contain only letters and spaces"),

  accountName: z.string()
    .min(1, "Account holder name is required")
    .regex(/^[A-Za-z\s]+$/, "Account holder name must contain only letters and spaces"),

  branchName: z.string()
    .min(1, "Branch name is required")
    .regex(/^[A-Za-z\s]+$/, "Branch name must contain only letters and spaces"),

  accountType: AccountTypeEnum,

  accountNum: z.string()
    .min(8, "Account number must be at least 8 characters")
    .regex(/^\d+$/, "Account number must contain only digits"),

  ifscCode: z.string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format")
});

export const UpdateBankDetailsSchema = z.object({
  bankName: z.string()
    .min(1, "Bank name is required")
    .regex(/^[A-Za-z\s]+$/, "Bank name must contain only letters and spaces")
    .optional(),

  accountName: z.string()
    .min(1, "Account holder name is required")
    .regex(/^[A-Za-z\s]+$/, "Account holder name must contain only letters and spaces")
    .optional(),

  branchName: z.string()
    .min(1, "Branch name is required")
    .regex(/^[A-Za-z\s]+$/, "Branch name must contain only letters and spaces")
    .optional(),

  accountType: AccountTypeEnum.optional(),

  accountNum: z.string()
    .min(8, "Account number must be at least 8 characters")
    .regex(/^\d+$/, "Account number must contain only digits")
    .optional(),

  ifscCode: z.string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format")
    .optional()
});



export const changeStatusSchema = z.object({
  status: ChangeStatus
});

export const editGeneralInfoSchema = z.object({
  profile: z.string().optional(),
  name: NameSchema.optional(),
  empCode: z.string().optional(),
  status: StatusEnum.optional(),
  dob: z.string().optional(),
  gender: GenderEnum.optional(),
  phoneNum: PhoneSchema.optional(),
  maritalStatus: MaritalStatusEnum.optional(),
  primaryEmail: z.string().email().optional(),
  secondaryEmail: z.string().email().optional(),
  panNum: z.string().optional(),
  adharNum: z.string().optional(),
  currentAddress: AddressSchema.optional(),
  permanentAddress: AddressSchema.optional(),
  experience: z.number().optional()
});


export const loginDetailsSchema = z.object({
  username: z.string(),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  loginEnable: z.boolean().optional(),
  accLocked: z.boolean().optional()
});

export const updateLoginDetailsSchema = z.object({
  username: z.string().optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
    .optional(),
  loginEnable: z.boolean().optional(),
  accLocked: z.boolean().optional()
});