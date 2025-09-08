import { EditGeneral, EditLoginDetails, General, LoginDetails, Status } from '../models/employees/employee.general';
import { Professional } from '../models/employees/employee.professional';
import { Employee, EmpCode } from '../models/employees/employee';
import { BankDetails } from '../models/employees/employee.bankDetails';
import admin from '../../firebase';
import { JOB } from '../models/employees/employee.job';
import { merge } from 'lodash';
import { createUserWithRole } from '../../auth/services/auth.service';
import sharp from "sharp";
import logger from "../../utils/logger";
import { sendEmailWithAttachment } from '../../utils/email';
import { PF } from '../models/employees/employee.pf';
import { SequenceNumber } from '../../gettingStarted/sequenceNumber/sequence.model';

const db = admin.firestore();
const bucket = admin.storage().bucket();

const generalCollection = db.collection('general');
const professionalCollection = db.collection('professional')
const employeeCollection = db.collection('employees')
const bankDetailsCollection = db.collection('bankDetails')
const pfCollection = db.collection('pfDetails')
const loanCollection = db.collection('loanDetails')
const previousCollection = db.collection('previousJobs')
const projectCollection = db.collection('resources')
const userCollection = db.collection('users')
const empCodeCollection = db.collection('empCode')
const departmentCollection = db.collection('departments');
const designationCollection = db.collection('designations');
const roleCollection = db.collection('roles');
const locationCollection = db.collection('locations');
const holidayGroupCollection = db.collection('holidayConfiguration');
const leaveTypeCollection = db.collection('leaves');
const payslipComponentCollection = db.collection('salaryStructures');
const workingPatternCollection = db.collection('workingPatterns');
const sequenceCollection = db.collection("sequenceNumbers");

const validateFieldExists = async (
  collection: FirebaseFirestore.CollectionReference,
  field: string,
  value: string,
  fieldLabel: string
): Promise<string> => {
  const snap = await collection.get();

  const doc = snap.docs.find(
    (doc) => String(doc.get(field) ?? "").toLowerCase() === value.toLowerCase()
  );

  if (!doc) {
    throw new Error(`${fieldLabel} "${value}" not valid`);
  }

  return String(doc.get(field));
};

export const addEmployee = async (generalData: Partial<General>, professinalData: Partial<Professional>) => {
  logger.info("Adding new employee...");
  try {
    const snapshot = await sequenceCollection.where("type", "==", "Employee").limit(1).get();
    const docRef = snapshot.docs[0].ref;
    const currentData = snapshot.docs[0].data() as SequenceNumber;

    let empCode = `${currentData.prefix}${String(currentData.nextAvailableNumber)}`

    const { name, primaryEmail, gender, phoneNum } = generalData;
    const { joiningDate, department, designation, location, reportingManager, workWeek, holidayGroup, ctcAnnual, payslipComponent, role, leaveType } = professinalData;
    const requiredFields = {
      name,
      empCode,
      primaryEmail,
      gender,
      phoneNum,
      joiningDate,
      department,
      designation,
      location,
      reportingManager,
      workWeek,
      holidayGroup,
      ctcAnnual,
      payslipComponent,
      role,
      leaveType
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      logger.error(`Missing required fields while adding employee: ${missingFields.join(", ")}`);
      throw new Error(`Missing required employee fields: ${missingFields.join(", ")}`);
    }

    // await validateFieldExists(departmentCollection, "name", department!, "Department");
    // await validateFieldExists(designationCollection, "designationName", designation!, "Designation");
    // await validateFieldExists(roleCollection, "roleName", role!, "Role");
    // await validateFieldExists(locationCollection, "cityName", location!, "Location");
    // await validateFieldExists(holidayGroupCollection, "groupName", holidayGroup!, "Holiday Group");
    // await validateFieldExists(leaveTypeCollection, "leaveType", leaveType!, "Leave Type");
    // await validateFieldExists(payslipComponentCollection, "groupName", payslipComponent!, "Payslip Component");
    // await validateFieldExists(workingPatternCollection, "name", workWeek!, "Working Pattern");

    const departmentValidated = await validateFieldExists(departmentCollection, "name", department!, "Department");
    const designationValidated = await validateFieldExists(designationCollection, "designationName", designation!, "Designation");
    const roleValidated = await validateFieldExists(roleCollection, "roleName", role!, "Role");
    const locationValidated = await validateFieldExists(locationCollection, "cityName", location!, "Location");
    const holidayGroupValidated = await validateFieldExists(holidayGroupCollection, "groupName", holidayGroup!, "Holiday Group");
    const leaveTypeValidated = await validateFieldExists(leaveTypeCollection, "leaveType", leaveType!, "Leave Type");
    const payslipComponentValidated = await validateFieldExists(payslipComponentCollection, "groupName", payslipComponent!, "Payslip Component");
    const workWeekValidated = await validateFieldExists(workingPatternCollection, "name", workWeek!, "Working Pattern");

    const general: General = { name: name!, empCode, primaryEmail: primaryEmail!, gender: gender!, phoneNum: phoneNum!, status: generalData.status || Status.ACTIVE };
    const professional: Professional = { joiningDate: joiningDate!, department: departmentValidated!, designation: designationValidated!, location: locationValidated!, reportingManager: reportingManager!, workWeek: workWeekValidated!, holidayGroup: holidayGroupValidated!, ctcAnnual: ctcAnnual!, payslipComponent: payslipComponentValidated!, role: roleValidated, leaveType: leaveTypeValidated };

    const generalRef = generalCollection.doc();
    const professionalRef = professionalCollection.doc();
    const employeeRef = employeeCollection.doc();
    const empCodeRef = empCodeCollection.doc();


    const batch = db.batch();

    batch.set(generalRef, general);
    batch.set(professionalRef, professional);
    batch.set(employeeRef, {
      generalId: generalRef.id,
      professionalId: professionalRef.id,
      isDeleted: false
    } satisfies Employee);

    if (!name!.last) {
      name!.last = name!.first
    }

    batch.set(empCodeRef, {
      empCode,
      fname: name!.first,
      lname: name!.last,
      emp_id: employeeRef.id,
      isDeleted: false
    } satisfies EmpCode)

    batch.update(generalRef, {
      id: generalRef.id
    })
    batch.update(professionalRef, {
      id: professionalRef.id
    })
    batch.update(docRef, {
      nextAvailableNumber: (currentData.nextAvailableNumber) + 1
    })
    await batch.commit();
    logger.info(`Employee created successfully with empCode=${empCode}`);
    return {
      msg: 'successfully created'
    };

  }
  catch (err: any) {
    logger.error(`Failed to add employee: ${err.message}`);
    throw err;
  }
};

export const getAllEmployees = async (limit: number = 10, page: number = 1) => {
  logger.info(`Fetching employees: page=${page}, limit=${limit}`);

  if (page < 1) page = 1;
  const totalSnapshot = await employeeCollection.where("isDeleted", "==", false).get();
  const total = totalSnapshot.size;

  let query = employeeCollection
    .where('isDeleted', '==', false)
    .orderBy('__name__')

  if (page > 1) {
    const skipCount = (page - 1) * limit;
    const snapshot = await query.limit(skipCount).get();

    const docs = snapshot.docs;
    if (docs.length > 0) {
      const lastVisible = docs[docs.length - 1];
      query = query.startAfter(lastVisible);
    }
  }
  query = query.limit(limit);
  const employeeSnapshot = await query.get();

  const employees = await Promise.all(
    employeeSnapshot.docs.map(async (employeeDoc) => {
      const employeeData = employeeDoc.data();
      if (employeeData.isDeleted) return null;

      const generalRef = generalCollection.doc(employeeData.generalId);
      const professionalRef = professionalCollection.doc(employeeData.professionalId);

      const [generalSnap, professionalSnap] = await Promise.all([
        generalRef.get(),
        professionalRef.get()
      ]);

      const general = generalSnap.exists ? generalSnap.data() : null;
      const professional = professionalSnap.exists ? professionalSnap.data() : null;
      if (!general || !professional) return null;

      return {
        id: employeeDoc.id,
        employeeCode: general.empCode,
        employeeName: `${general.name?.first || ''} ${general.name?.last || ''}`.trim(),
        joiningDate: professional.joiningDate,
        designation: professional.designation,
        department: professional.department,
        location: professional.location,
        gender: general.gender,
        status: general.status,
        payslipComponent: professional.payslipComponent
      };
    })
  );

  return {
    total,
    page,
    limit,
    employees: employees.filter(Boolean),
  };
};

// export const getAllEmployees = async (limit?: number, page?: number) => {
//   logger.info(`Fetching employees: page=${page}, limit=${limit}`);

//   let query: FirebaseFirestore.Query = employeeCollection
//     .where("isDeleted", "==", false)
//     .orderBy("__name__");

//   const totalSnap = await employeeCollection
//     .where("isDeleted", "==", false)
//     .count()
//     .get();
//   const total = totalSnap.data().count;

//   // Apply pagination only if both are provided
//   if (limit && page) {
//     if (page < 1) page = 1;

//     if (page > 1) {
//       const skipCount = (page - 1) * limit;
//       const snapshot = await query.limit(skipCount).get();
//       const docs = snapshot.docs;
//       if (docs.length > 0) {
//         const lastVisible = docs[docs.length - 1];
//         query = query.startAfter(lastVisible);
//       }
//     }

//     query = query.limit(limit);
//   }

//   const employeeSnapshot = await query.get();

//   const employees = await Promise.all(
//     employeeSnapshot.docs.map(async (employeeDoc) => {
//       const employeeData = employeeDoc.data();
//       if (employeeData.isDeleted) return null;

//       const [generalSnap, professionalSnap] = await Promise.all([
//         generalCollection.doc(employeeData.generalId).get(),
//         professionalCollection.doc(employeeData.professionalId).get(),
//       ]);

//       const general = generalSnap.exists ? generalSnap.data() : null;
//       const professional = professionalSnap.exists ? professionalSnap.data() : null;
//       if (!general || !professional) return null;

//       return {
//         id: employeeDoc.id,
//         employeeCode: general.empCode,
//         employeeName: `${general.name?.first || ""} ${general.name?.last || ""}`.trim(),
//         joiningDate: professional.joiningDate,
//         designation: professional.designation,
//         department: professional.department,
//         location: professional.location,
//         gender: general.gender,
//         status: general.status,
//         payslipComponent: professional.payslipComponent,
//       };
//     })
//   );

//   // Build response
//   const response: any = {
//     total,
//     employees: employees.filter(Boolean),
//   };

//   if (limit && page) {
//     response.page = page;
//     response.limit = limit;
//   }

//   return response;
// };

// // export const getAllEmployees = async (limit?: number, page?: number) => {
//   logger.info(`Fetching employees: page=${page}, limit=${limit}`);

//   let query: FirebaseFirestore.Query = employeeCollection
//     .where("isDeleted", "==", false)
//     .orderBy("__name__");

//   const totalSnap = await employeeCollection.where("isDeleted", "==", false).count().get();
//   const total = totalSnap.data().count;

//   if (limit && page) {
//     if (page < 1) page = 1;

//     if (page > 1) {
//       const skipCount = (page - 1) * limit;
//       const snapshot = await query.limit(skipCount).get();
//       const docs = snapshot.docs;
//       if (docs.length > 0) {
//         const lastVisible = docs[docs.length - 1];
//         query = query.startAfter(lastVisible);
//       }
//     }

//     query = query.limit(limit);
//   }

//   const employeeSnapshot = await query.get();

//   const employees = await Promise.all(
//     employeeSnapshot.docs.map(async (employeeDoc) => {
//       const employeeData = employeeDoc.data();
//       if (employeeData.isDeleted) return null;

//       const [generalSnap, professionalSnap] = await Promise.all([
//         generalCollection.doc(employeeData.generalId).get(),
//         professionalCollection.doc(employeeData.professionalId).get(),
//       ]);

//       const general = generalSnap.exists ? generalSnap.data() : null;
//       const professional = professionalSnap.exists ? professionalSnap.data() : null;
//       if (!general || !professional) return null;

//       return {
//         id: employeeDoc.id,
//         employeeCode: general.empCode,
//         employeeName: `${general.name?.first || ""} ${general.name?.last || ""}`.trim(),
//         joiningDate: professional.joiningDate,
//         designation: professional.designation,
//         department: professional.department,
//         location: professional.location,
//         gender: general.gender,
//         status: general.status,
//         payslipComponent: professional.payslipComponent,
//       };
//     })
//   );

//   return {
//     total,
//     page: page ?? null,
//     limit: limit ?? null,
//     employees: employees.filter(Boolean),
//   };
// };

export const addLoginDetails = async (generalId: string, loginDetails: LoginDetails) => {

  const generalRef = db.collection('general').doc(generalId);
  const generalSnap = await generalRef.get();
  if (!generalSnap.exists) throw new Error("General info not found");

  const employeeSnap = await db
    .collection('employees')
    .where('generalId', '==', generalId)
    .limit(1)
    .get();
  if (employeeSnap.empty) throw new Error("Employee record not found");


  const employeeData = employeeSnap.docs[0].data();
  const professionalId = employeeData.professionalId;
  if (!professionalId) throw new Error("professionalId missing in employee document");

  const professionalSnap = await db
    .collection('professional')
    .doc(professionalId)
    .get();

  if (!professionalSnap.exists) throw new Error("Professional info not found");

  const role = professionalSnap.data()!.role;
  const existingData = generalSnap.data()
  const mergedData = merge({}, existingData, { loginDetails });
  await generalRef.set(mergedData);

  const username = loginDetails.username;
  if (!username) throw new Error("Username is required");

  const email = loginDetails.username
  const password = loginDetails.password
  const displayName = loginDetails.username
  let isLoginEnabled = loginDetails.loginEnable
  let isAccountLocked = loginDetails.accLocked
  if (!isLoginEnabled || !isAccountLocked) {
    isLoginEnabled = true
    isAccountLocked = false
  }
  await createUserWithRole(email, password, displayName, role, isLoginEnabled, isAccountLocked)

  return {
    message: 'Login details and user created successfully',
    loginDetails,
    role
  };
};

export const editLoginDetails = async (id: string, loginDetailsUpdate: Partial<EditLoginDetails>) => {
  const ref = generalCollection.doc(id);
  const userref = userCollection.doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("General info not found");

  const userSnap = await userref.get();
  if (!userSnap) throw new Error("users info not found");

  const existingData = snap.data();
  const userData = userSnap.data()
  const usermergedData = merge({}, userData, {
    password: loginDetailsUpdate.password,
    loginEnable: loginDetailsUpdate.loginEnable,
    accLocked: loginDetailsUpdate.accLocked
  })
  const mergedData = merge({}, existingData, {
    loginDetails: { ...existingData?.loginDetails, ...loginDetailsUpdate }
  });
  await userref.set(usermergedData, { merge: true })
  await ref.set(mergedData, { merge: true });
  return { message: "Login details updated successfully", updated: mergedData.loginDetails };
};

export const deleteEmployee = async (id: string) => {
  const employeeRef = employeeCollection.doc(id);
  const employeeSnap = await employeeRef.get();


  if (!employeeSnap.exists) {
    throw new Error(`Employee with ID ${id} does not exist`);
  }

  const employeeData = employeeSnap.data();

  const generalId = employeeData?.generalId;
  const generalRef = generalCollection.doc(generalId)
  const generalSnap = await generalRef.get()

  const empCode = generalSnap.data()?.empCode;

  const loanIds: string[] = employeeData?.loanId || [];
  if (!empCode) {
    throw new Error(`Employee ${id} does not have an empCode`);
  }

  const resourcesSnap = await db
    .collection("resources")
    .where("empCode", "==", empCode)
    .get();

  const projectsSnap = await db
    .collection("projects")
    .where("resources", "array-contains", empCode)
    .get();

  const empCodeSnap = await empCodeCollection
    .where("emp_id", "==", id)
    .limit(1)
    .get()

  const batch = db.batch();

  if (!empCodeSnap.empty) {
    const empCodeDoc = empCodeSnap.docs[0];
    batch.update(empCodeDoc.ref, { isDeleted: true });
  }
  loanIds.forEach((loanId) => {
    const loanRef = db.collection("loanDetails").doc(loanId);
    batch.update(loanRef, { isDeleted: true });
  });

  batch.update(employeeRef, { isDeleted: true });
  resourcesSnap.forEach((doc) => {
    batch.update(doc.ref, { isDeleted: true });
  });



  projectsSnap.forEach((doc) => {
    const projectData = doc.data();
    const currentTeamMember = projectData.teamMember || 0;

    batch.update(doc.ref, {
      resources: admin.firestore.FieldValue.arrayRemove(empCode),
      teamMember: Math.max(0, currentTeamMember - 1)
    });
  });
  await batch.commit();

  return {
    message: "Employee and related resources marked as deleted",
  };
};

export const getEmployeeById = async (id: string) => {
  const docRef = employeeCollection.doc(id);
  const docSnap = await docRef.get();

  if (!docSnap.exists) throw new Error("Employee not found");

  const data = docSnap.data();
  return {
    employeeId: id,
    generalId: data?.generalId,
    professionalId: data?.professionalId,
    bankDetailId: data?.bankDetailId,
    pfId: data?.pfId,
    loanId: data?.loanId
  };
};

export const editGeneralInfo = async (id: string, updateData: Partial<EditGeneral>) => {
  const ref = generalCollection.doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("General info not found");

  const existingData = snap.data();
  const mergedData = merge({}, existingData, updateData);
  await ref.set(mergedData);
  return { message: "General info updated successfully" };
};

export const changeStatus = async (id: string, status: string) => {
  const data = await getEmployeeById(id)
  const generalId = data.generalId;
  const professionalId = data.professionalId

  const generalRef = generalCollection.doc(generalId);
  const professionalRef = professionalCollection.doc(professionalId);
  const batch = db.batch();
  const normalizedStatus =
    typeof status === "string" ? status : (status as { status: string }).status;

  batch.update(generalRef, {
    status: normalizedStatus
  })
  await batch.commit();

  const [generalSnap, professionalSnap] = await Promise.all([
    generalRef.get(),
    professionalRef.get()
  ]);
  const general = generalSnap.exists ? generalSnap.data() : null;
  const professional = professionalSnap.exists ? professionalSnap.data() : null;
  if (!general || !professional) return null;

  return {
    id: id,
    employeeCode: general.empCode,
    employeeName: `${general.name?.first || ''} ${general.name?.last || ''}`.trim(),
    joiningDate: professional.joiningDate,
    designation: professional.designation,
    department: professional.department,
    location: professional.location,
    gender: general.gender,
    status: general.status,
    payslipComponent: professional.payslipComponent
  };
}

export const editProfessionalInfo = async (id: string, updateData: Partial<Professional>) => {
  const ref = professionalCollection.doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Professional info not found");

  const existingData = snap.data();
  const mergedData = merge({}, existingData, updateData);

  await ref.set(mergedData);
  return { message: "Professional info updated successfully" };
};

export const addBankDetails = async (Id: string, data: Partial<BankDetails>) => {
  const { accountType, accountName, accountNum, ifscCode, bankName, branchName } = data;

  if (!accountType || !accountName || !ifscCode || !bankName || !accountNum || !branchName) {
    throw new Error("Missing required bank detail fields");
  }

  const employeeRef = employeeCollection.doc(Id);
  const employeeSnap = await employeeRef.get();

  if (!employeeSnap.exists) {
    throw new Error("Employee not found");
  }

  const employeeData = employeeSnap.data();

  if (employeeData!.bankDetailId) {
    return {
      bankDetailId: employeeData!.bankDetailId,
      message: "Bank details already exist for this employee"
    };
  }
  const bankRef = bankDetailsCollection.doc();
  const batch = db.batch();

  batch.set(bankRef, {
    accountType,
    accountName,
    accountNum,
    ifscCode,
    bankName,
    branchName,
    id: bankRef.id
  });

  batch.update(employeeRef, {
    bankDetailId: bankRef.id
  });

  await batch.commit();

  return {
    bankDetailId: bankRef.id,
    message: "Bank details added successfully"
  };
};

export const editBankDetails = async (id: string, updateData: Partial<BankDetails>) => {
  const ref = bankDetailsCollection.doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("BankDetails info not found");

  await ref.update(updateData);
  return { message: "BankDetails info updated successfully", updated: updateData };
};

export const getCompleteEmployeeDetailsByCode = async (empCode: string) => {
  const generalSnap = await generalCollection.where("empCode", "==", empCode).get();
  if (generalSnap.empty) throw new Error("No employee found with this employee code");

  const generalDoc = generalSnap.docs[0];
  const generalId = generalDoc.id;

  const employeeSnap = await employeeCollection.where("generalId", "==", generalId).get();
  if (employeeSnap.empty) throw new Error("Employee record not found");

  const employeeDoc = employeeSnap.docs[0];
  const employeeData = employeeDoc.data();

  const {
    professionalId,
    bankDetailId,
    pfId,
    loanId,
    previousJobId,
    projectId
  } = employeeData;

  const [
    professionalSnap,
    bankSnap,
    pfSnap
  ] = await Promise.all([
    professionalId ? professionalCollection.doc(professionalId).get() : null,
    bankDetailId ? bankDetailsCollection.doc(bankDetailId).get() : null,
    pfId ? pfCollection.doc(pfId).get() : null
  ]);

  const loanIds: string[] = loanId || [];
  const loanSnaps = await Promise.all(
    loanIds.map(id => loanCollection.doc(id).get())
  );

  const previousJobIds: string[] = previousJobId || [];
  const previousSnaps = await Promise.all(
    previousJobIds.map(id => previousCollection.doc(id).get())
  )

  const projectIds: string[] = projectId || [];
  const projectSnaps = await Promise.all(
    projectIds.map(id => projectCollection.doc(id).get())
  )
  const nullBankDetails = {
    bankName: null,
    accountName: null,
    branchName: null,
    accountNum: null,
    accountType: null,
    ifscCode: null,
  };
  const nullPF = {
    employeePfEnable: false,
    pfNum: null,
    employeerPfEnable: false,
    uanNum: null,
    esiEnable: false,
    esiNum: null,
    professionalTax: false,
    labourWelfare: false
  };

  const projects = projectSnaps
    .filter(snap => snap.exists && !snap.data()?.isDeleted)
    .map(snap => ({
      id: snap.id,
      ...snap.data()
    }));

  return {
    general: generalDoc.data(),
    professional: professionalSnap?.exists ? professionalSnap.data() : null,
    bankDetails: bankSnap?.exists ? bankSnap.data() : nullBankDetails,
    pf: pfSnap?.exists ? pfSnap.data() : nullPF,
    loan: loanSnaps.map(snap => snap.exists ? snap.data() : null),
    previous: previousSnaps.map(snap => snap.exists ? snap.data() : null),
    project: projects

  };
};

export const addPreviousJob = async (empId: string, job: JOB) => {
  const employeeRef = employeeCollection.doc(empId);
  const employeeSnap = await employeeRef.get();

  if (!employeeSnap.exists) {
    throw new Error('Employee not found');
  }

  const jobRef = db.collection('previousJobs').doc();
  const jobWithId = { id: jobRef.id, ...job };

  const batch = db.batch();

  batch.set(jobRef, jobWithId);

  batch.update(employeeRef, {
    previousJobId: admin.firestore.FieldValue.arrayUnion(jobRef.id)
  });

  await batch.commit();

  return {
    message: 'Previous job added successfully',
    job: jobWithId
  };
};

export const editPreviousJob = async (jobId: string, updatedData: Partial<JOB>) => {
  const jobRef = previousCollection.doc(jobId);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    throw new Error('Previous job not found');
  }

  await jobRef.update(updatedData);

  return {
    message: 'Previous job updated successfully',
    updatedFields: updatedData,
    jobId
  };
};

export const uploadProfilePicture = async (empCode: string, file: Express.Multer.File) => {
  if (!file) throw new Error('No file provided');

  const snap = await db.collection('general').where('empCode', '==', empCode).get();

  if (snap.empty) {
    throw new Error('Employee not found');
  }

  const generalDoc = snap.docs[0];
  const generalRef = generalDoc.ref;

  const optimizedBuffer = await sharp(file.buffer)
    .resize(400, 400, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();

  const fileName = `profile_pictures/${empCode}_${Date.now()}`;
  const blob = bucket.file(fileName);

  await new Promise<void>((resolve, reject) => {
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on('error', reject);
    blobStream.on('finish', resolve);

    blobStream.end(optimizedBuffer);
  });
  const [signedUrl] = await blob.getSignedUrl({
    action: "read",
    expires: "03-01-2500",
  });

  await generalRef.update({
    profile: signedUrl,
  });

  return signedUrl;
};

export const sendEmailLoginDetails = async (empCode: string) => {

  const employeeSnap = await generalCollection.where('empCode', '==', empCode).get();

  if (employeeSnap.empty) {
    throw new Error('Employee not found');
  }

  const employeeData = employeeSnap.docs[0].data();
  console.log("Sending email to:", employeeData.primaryEmail);
  const emailOptions = {
    to: [employeeData.primaryEmail],
    subject: 'Your Login Details',
    body: `Hello ${employeeData.name.first},\n\nHere are your login details:\n\nEmail: ${employeeData.loginDetails.username}\nPassword: ${employeeData.loginDetails.password}\n\nPlease change your password after logging in.\n\nBest regards,\nHR Team`
  };

  await sendEmailWithAttachment(emailOptions);
};

export const uploadEmployee = async (employees: { general: Partial<General>, professional: Partial<Professional> }[]) => {
  logger.info(`Uploading ${employees.length} employees...`);

  try {
    const batches: FirebaseFirestore.WriteBatch[] = [];
    let batch = db.batch();
    let opCount = 0;

    for (const emp of employees) {
      const { generalData, professionalData } = emp as any;

      const { name, empCode, primaryEmail, gender, phoneNum } = generalData;
      const { joiningDate, department, designation, location, reportingManager, workWeek, holidayGroup, ctcAnnual, payslipComponent, role, leaveType } = professionalData;

      if (!name || !empCode || !primaryEmail || !gender || !phoneNum ||
        !joiningDate || !department || !designation || !location || !reportingManager ||
        !workWeek || !holidayGroup || !ctcAnnual || !payslipComponent || !role || !leaveType) {
        logger.warn(`Skipping employee with empCode=${empCode} due to missing fields`);
        continue;
      }

      const generalRef = generalCollection.doc();
      const professionalRef = professionalCollection.doc();
      const employeeRef = employeeCollection.doc();
      const empCodeRef = empCodeCollection.doc();

      const general: General = { name, empCode, primaryEmail, gender, phoneNum, status: generalData.status || Status.ACTIVE };
      const professional: Professional = { joiningDate, department, designation, location, reportingManager, workWeek, holidayGroup, ctcAnnual, payslipComponent, role, leaveType };

      batch.set(generalRef, { ...general, id: generalRef.id });
      batch.set(professionalRef, { ...professional, id: professionalRef.id });
      batch.set(employeeRef, {
        generalId: generalRef.id,
        professionalId: professionalRef.id,
        isDeleted: false
      } satisfies Employee);

      batch.set(empCodeRef, {
        empCode,
        fname: name.first,
        lname: name.last || name.first,
        emp_id: employeeRef.id,
        isDeleted: false
      } satisfies EmpCode);

      opCount += 4;

      if (opCount >= 450) {
        batches.push(batch);
        batch = db.batch();
        opCount = 0;
      }
    }

    if (opCount > 0) batches.push(batch);

    for (const b of batches) {
      await b.commit();
    }

    logger.info(`Successfully uploaded ${employees.length} employees`);
    return { msg: "Bulk employees created successfully", count: employees.length };

  } catch (err: any) {
    logger.error(`Failed to upload employees: ${err.message}`);
    throw err;
  }
};

export const addPFData = async (Id: string, pfData: PF) => {
  const employeeRef = employeeCollection.doc(Id);
  const employeeSnap = await employeeRef.get();

  if (!employeeSnap.exists) {
    throw new Error('Employee not found');
  }

  const employeeData = employeeSnap.data();
  if (employeeData!.pfId) {
    return {
      pfId: employeeData!.pfId,
      message: "PF already exists for this employee"
    };
  }
  const pfRef = pfCollection.doc();
  const batch = db.batch();

  batch.set(pfRef, {
    id: pfRef.id,
    ...pfData
  });

  batch.update(employeeRef, {
    pfId: pfRef.id
  });

  await batch.commit();

  return { message: "PF data added successfully" };
};

export const editPFData = async (id: string, updateData: Partial<PF>) => {
  const pfRef = pfCollection.doc(id);
  const pfSnap = await pfRef.get();

  if (!pfSnap.exists) {
    throw new Error('PF data not found');
  }

  await pfRef.update(updateData);

  return { message: "PF data updated successfully" };
};

