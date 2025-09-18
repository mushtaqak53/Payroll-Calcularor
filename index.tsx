/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface Employee {
  id: number;
  name: string;
  fatherName: string;
  cellNo: string;
  cnic: string;
  dateOfAppointment: string;
  designation: string;
  gpf: boolean;
  salary: number; // This will now be monthly salary
  travelAllowance: number;
  medicalAllowance: number;
  adhocAllowance: number;
  lateArrivals: number;
  leaves: number;
  security: number;
}

interface PayrollResult {
  employee: Employee;
  monthlyGross: number;
  monthlyDeductions: number;
  monthlyNet: number;
}

// State
let employees: Employee[] = [];
let payrollResults: PayrollResult[] = [];
let nextId = 0;
let editingEmployeeId: number | null = null;


// DOM Elements
const addEmployeeForm = document.getElementById('add-employee-form') as HTMLFormElement;
const employeeNameInput = document.getElementById('employee-name') as HTMLInputElement;
const fatherNameInput = document.getElementById('father-name') as HTMLInputElement;
const cellNoInput = document.getElementById('cell-no') as HTMLInputElement;
const cnicNoInput = document.getElementById('cnic-no') as HTMLInputElement;
const dateOfAppointmentInput = document.getElementById('date-of-appointment') as HTMLInputElement;
const designationInput = document.getElementById('designation') as HTMLInputElement;
const monthlySalaryInput = document.getElementById('monthly-salary') as HTMLInputElement;
const travelAllowanceInput = document.getElementById('travel-allowance') as HTMLInputElement;
const medicalAllowanceInput = document.getElementById('medical-allowance') as HTMLInputElement;
const adhocAllowanceInput = document.getElementById('adhoc-allowance') as HTMLInputElement;
const lateArrivalsInput = document.getElementById('late-arrivals') as HTMLInputElement;
const leavesInput = document.getElementById('leaves') as HTMLInputElement;
const securityInput = document.getElementById('security') as HTMLInputElement;
const searchEmployeeInput = document.getElementById('search-employee') as HTMLInputElement;
const employeeList = document.getElementById('employee-list') as HTMLUListElement;
const calculatePayrollBtn = document.getElementById('calculate-payroll-btn') as HTMLButtonElement;
const generateSummaryBtn = document.getElementById('generate-summary-btn') as HTMLButtonElement;
const downloadAllBtn = document.getElementById('download-all-btn') as HTMLButtonElement;
const previewAllBtn = document.getElementById('preview-all-btn') as HTMLButtonElement;
const payrollTableContainer = document.getElementById('payroll-table-container') as HTMLDivElement;
const summaryContainer = document.getElementById('summary-container') as HTMLDivElement;
const summaryOutput = document.getElementById('summary-output') as HTMLDivElement;
const loader = document.getElementById('loader') as HTMLDivElement;

// Edit Modal Elements
const editModal = document.getElementById('edit-modal') as HTMLDivElement;
const editEmployeeForm = document.getElementById('edit-employee-form') as HTMLFormElement;
const editEmployeeNameInput = document.getElementById('edit-employee-name') as HTMLInputElement;
const editFatherNameInput = document.getElementById('edit-father-name') as HTMLInputElement;
const editCellNoInput = document.getElementById('edit-cell-no') as HTMLInputElement;
const editCnicNoInput = document.getElementById('edit-cnic-no') as HTMLInputElement;
const editDateOfAppointmentInput = document.getElementById('edit-date-of-appointment') as HTMLInputElement;
const editDesignationInput = document.getElementById('edit-designation') as HTMLInputElement;
const editMonthlySalaryInput = document.getElementById('edit-monthly-salary') as HTMLInputElement;
const editTravelAllowanceInput = document.getElementById('edit-travel-allowance') as HTMLInputElement;
const editMedicalAllowanceInput = document.getElementById('edit-medical-allowance') as HTMLInputElement;
const editAdhocAllowanceInput = document.getElementById('edit-adhoc-allowance') as HTMLInputElement;
const editLateArrivalsInput = document.getElementById('edit-late-arrivals') as HTMLInputElement;
const editLeavesInput = document.getElementById('edit-leaves') as HTMLInputElement;
const editSecurityInput = document.getElementById('edit-security') as HTMLInputElement;
const cancelEditBtn = document.getElementById('cancel-edit-btn') as HTMLButtonElement;


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function renderEmployeeList() {
    employeeList.innerHTML = '';

    if (employees.length === 0) {
        employeeList.innerHTML = '<li class="placeholder">No employees added yet.</li>';
        calculatePayrollBtn.disabled = true;
        searchEmployeeInput.style.display = 'none';
    } else {
        searchEmployeeInput.style.display = 'block';
        calculatePayrollBtn.disabled = false;
        
        const searchTerm = searchEmployeeInput.value.toLowerCase().trim();
        const filteredEmployees = employees.filter(employee => 
            employee.name.toLowerCase().includes(searchTerm)
        );

        if (filteredEmployees.length === 0) {
            employeeList.innerHTML = '<li class="placeholder">No employees match your search.</li>';
        } else {
            filteredEmployees.forEach(employee => {
                const li = document.createElement('li');
                li.setAttribute('aria-label', `Employee: ${employee.name}, Designation: ${employee.designation}`);
                
                const textDiv = document.createElement('div');
                textDiv.innerHTML = `<span class="employee-name">${employee.name}</span><span class="employee-designation">${employee.designation}</span>`;
                li.appendChild(textDiv);

                const buttonsDiv = document.createElement('div');
                buttonsDiv.classList.add('employee-actions');

                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.classList.add('edit');
                editBtn.setAttribute('aria-label', `Edit ${employee.name}`);
                editBtn.onclick = () => openEditModal(employee.id);
                buttonsDiv.appendChild(editBtn);

                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remove';
                removeBtn.classList.add('danger');
                removeBtn.setAttribute('aria-label', `Remove ${employee.name}`);
                removeBtn.onclick = () => removeEmployee(employee.id);
                buttonsDiv.appendChild(removeBtn);
                
                li.appendChild(buttonsDiv);
                employeeList.appendChild(li);
            });
        }
    }
}

function addEmployee(event: Event) {
    event.preventDefault();
    const name = employeeNameInput.value.trim();
    const fatherName = fatherNameInput.value.trim();
    const cellNo = cellNoInput.value.trim();
    const cnic = cnicNoInput.value.trim();
    const dateOfAppointment = dateOfAppointmentInput.value;
    const designation = designationInput.value.trim();
    const gpf = (document.querySelector('input[name="gpf"]:checked') as HTMLInputElement).value === 'true';
    const salary = parseFloat(monthlySalaryInput.value);
    const travelAllowance = parseFloat(travelAllowanceInput.value) || 0;
    const medicalAllowance = parseFloat(medicalAllowanceInput.value) || 0;
    const adhocAllowance = parseFloat(adhocAllowanceInput.value) || 0;
    const lateArrivals = parseFloat(lateArrivalsInput.value) || 0;
    const leaves = parseFloat(leavesInput.value) || 0;
    const security = parseFloat(securityInput.value) || 0;


    if (name && fatherName && cellNo && cnic && dateOfAppointment && designation && salary > 0) {
        employees.push({ 
            id: nextId++, 
            name,
            fatherName,
            cellNo,
            cnic,
            dateOfAppointment,
            designation,
            gpf,
            salary,
            travelAllowance,
            medicalAllowance,
            adhocAllowance,
            lateArrivals,
            leaves,
            security
        });
        renderEmployeeList();
        addEmployeeForm.reset();
        employeeNameInput.focus();
    }
}

function removeEmployee(id: number) {
    employees = employees.filter(employee => employee.id !== id);
    if (employees.length === 0) {
        searchEmployeeInput.value = '';
    }
    renderEmployeeList();
}

function openEditModal(id: number) {
    const employee = employees.find(e => e.id === id);
    if (!employee) return;

    editingEmployeeId = id;
    
    editEmployeeNameInput.value = employee.name;
    editFatherNameInput.value = employee.fatherName;
    editCellNoInput.value = employee.cellNo;
    editCnicNoInput.value = employee.cnic;
    editDateOfAppointmentInput.value = employee.dateOfAppointment;
    editDesignationInput.value = employee.designation;
    (document.querySelector(`input[name="edit-gpf"][value="${employee.gpf}"]`) as HTMLInputElement).checked = true;
    editMonthlySalaryInput.value = employee.salary.toString();
    editTravelAllowanceInput.value = employee.travelAllowance.toString();
    editMedicalAllowanceInput.value = employee.medicalAllowance.toString();
    editAdhocAllowanceInput.value = employee.adhocAllowance.toString();
    editLateArrivalsInput.value = employee.lateArrivals.toString();
    editLeavesInput.value = employee.leaves.toString();
    editSecurityInput.value = employee.security.toString();

    editModal.style.display = 'flex';
}

function closeEditModal() {
    editingEmployeeId = null;
    editModal.style.display = 'none';
    editEmployeeForm.reset();
}

function saveEmployeeChanges(event: Event) {
    event.preventDefault();
    if (editingEmployeeId === null) return;

    const employeeIndex = employees.findIndex(e => e.id === editingEmployeeId);
    if (employeeIndex === -1) return;

    const name = editEmployeeNameInput.value.trim();
    const fatherName = editFatherNameInput.value.trim();
    const cellNo = editCellNoInput.value.trim();
    const cnic = editCnicNoInput.value.trim();
    const dateOfAppointment = editDateOfAppointmentInput.value;
    const designation = editDesignationInput.value.trim();
    const gpf = (document.querySelector('input[name="edit-gpf"]:checked') as HTMLInputElement).value === 'true';
    const salary = parseFloat(editMonthlySalaryInput.value);
    const travelAllowance = parseFloat(editTravelAllowanceInput.value) || 0;
    const medicalAllowance = parseFloat(editMedicalAllowanceInput.value) || 0;
    const adhocAllowance = parseFloat(editAdhocAllowanceInput.value) || 0;
    const lateArrivals = parseFloat(editLateArrivalsInput.value) || 0;
    const leaves = parseFloat(editLeavesInput.value) || 0;
    const security = parseFloat(editSecurityInput.value) || 0;

    if (name && fatherName && cellNo && cnic && dateOfAppointment && designation && salary > 0) {
        employees[employeeIndex] = {
            ...employees[employeeIndex],
            name,
            fatherName,
            cellNo,
            cnic,
            dateOfAppointment,
            designation,
            gpf,
            salary,
            travelAllowance,
            medicalAllowance,
            adhocAllowance,
            lateArrivals,
            leaves,
            security
        };
        renderEmployeeList();
        closeEditModal();
    }
}

function calculatePayroll() {
    payrollResults = employees.map(employee => {
        const monthlyGross = employee.salary;
        const totalAllowances = employee.travelAllowance + employee.medicalAllowance + employee.adhocAllowance;
        const monthlyDeductions = employee.lateArrivals + employee.leaves + employee.security;
        
        const monthlyNet = monthlyGross + totalAllowances - monthlyDeductions;
        return {
            employee: employee,
            monthlyGross,
            monthlyDeductions,
            monthlyNet,
        };
    });
    renderPayrollTable();
    generateSummaryBtn.style.display = 'inline-block';
    downloadAllBtn.style.display = 'inline-block';
    previewAllBtn.style.display = 'inline-block';
    summaryContainer.style.display = 'none';
    summaryOutput.innerHTML = '';
}

function renderPayrollTable() {
    payrollTableContainer.innerHTML = '';
    if (payrollResults.length === 0) return;

    const table = document.createElement('table');
    table.setAttribute('aria-label', 'Payroll Results');
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Employee Name</th>
            <th>Monthly Gross</th>
            <th>Monthly Deductions</th>
            <th>Monthly Net</th>
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    payrollResults.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${result.employee.name}</td>
            <td>Rs.${result.monthlyGross.toFixed(2)}</td>
            <td>Rs.${result.monthlyDeductions.toFixed(2)}</td>
            <td>Rs.${result.monthlyNet.toFixed(2)}</td>
        `;

        const actionsCell = document.createElement('td');
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'table-actions';

        const previewBtn = document.createElement('button');
        previewBtn.textContent = 'Preview';
        previewBtn.classList.add('secondary', 'small');
        previewBtn.onclick = () => previewPdfForEmployee(result);
        actionsDiv.appendChild(previewBtn);

        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download';
        downloadBtn.classList.add('secondary', 'small');
        downloadBtn.onclick = () => downloadPdfForEmployee(result);
        actionsDiv.appendChild(downloadBtn);

        actionsCell.appendChild(actionsDiv);
        row.appendChild(actionsCell);
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    payrollTableContainer.appendChild(table);
}

function buildEmployeeSlip(doc: jsPDF, result: PayrollResult) {
    const employee = result.employee;
    const totalAllowances = employee.travelAllowance + employee.medicalAllowance + employee.adhocAllowance;
    const totalEarnings = result.monthlyGross + totalAllowances;

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("The Right-Way Education System, Quetta.", doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Salary Slip for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

    // Employee Details Table
    autoTable(doc, {
        startY: 40,
        head: [['Employee Details', '']],
        body: [
            ['Employee Name', employee.name],
            ['Father Name', employee.fatherName],
            ['Designation', employee.designation],
            ['CNIC No', employee.cnic],
            ['Cell No', employee.cellNo],
            ['Date of Appointment', employee.dateOfAppointment],
            ['GPF Status', employee.gpf ? 'Applied' : 'Not Applied'],
        ],
        theme: 'grid',
        headStyles: { fillColor: '#4a90e2', halign: 'center' },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });

    const lastY = (doc as any).lastAutoTable.finalY;

    // Earnings & Deductions Tables
    autoTable(doc, {
        startY: lastY + 10,
        head: [['Earnings', 'Amount (Rs.)']],
        body: [
            ['Monthly Gross Salary', employee.salary.toFixed(2)],
            ['Travel Allowance', employee.travelAllowance.toFixed(2)],
            ['Medical Allowance', employee.medicalAllowance.toFixed(2)],
            ['Adhoc Allowance', employee.adhocAllowance.toFixed(2)],
        ],
        foot: [['Total Earnings', totalEarnings.toFixed(2)]],
        theme: 'striped',
        headStyles: { fillColor: [40, 167, 69] }, // Green
        footStyles: { fillColor: '#f0f0f0', fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } },
    });
    
    const lastY2 = (doc as any).lastAutoTable.finalY;

    autoTable(doc, {
        startY: lastY + 10,
        head: [['Deductions', 'Amount (Rs.)']],
        body: [
            ['Late Arrivals', employee.lateArrivals.toFixed(2)],
            ['Leaves', employee.leaves.toFixed(2)],
            ['Security', employee.security.toFixed(2)],
        ],
        foot: [['Total Deductions', result.monthlyDeductions.toFixed(2)]],
        theme: 'striped',
        headStyles: { fillColor: [220, 53, 69] }, // Red
        footStyles: { fillColor: '#f0f0f0', fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: doc.internal.pageSize.getWidth() / 2 + 5 }
    });

    // Net Salary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Net Salary Payable: Rs. ${result.monthlyNet.toFixed(2)}`, 14, lastY2 + 20);
}


function downloadPdfForEmployee(result: PayrollResult) {
    const doc = new jsPDF();
    buildEmployeeSlip(doc, result);
    doc.save(`Salary_Slip_${result.employee.name.replace(/\s/g, '_')}.pdf`);
}

function previewPdfForEmployee(result: PayrollResult) {
    const doc = new jsPDF();
    buildEmployeeSlip(doc, result);
    doc.output('dataurlnewwindow');
}


function downloadAllSlips() {
    const doc = new jsPDF();
    payrollResults.forEach((result, index) => {
        buildEmployeeSlip(doc, result);
        if (index < payrollResults.length - 1) {
            doc.addPage();
        }
    });
    doc.save('All_Salary_Slips.pdf');
}

function previewAllSlips() {
    const doc = new jsPDF();
    payrollResults.forEach((result, index) => {
        buildEmployeeSlip(doc, result);
        if (index < payrollResults.length - 1) {
            doc.addPage();
        }
    });
    doc.output('dataurlnewwindow');
}


async function generateFinancialSummary() {
    if (payrollResults.length === 0) return;

    summaryContainer.style.display = 'block';
    loader.style.display = 'block';
    summaryOutput.innerHTML = '';
    generateSummaryBtn.disabled = true;

    const payrollDataForPrompt = payrollResults.map(r => ({
        name: r.employee.name,
        monthlyGross: r.monthlyGross,
        monthlyDeductions: r.monthlyDeductions,
        monthlyNet: r.monthlyNet
    }));

    const prompt = `
        Based on the following JSON monthly payroll data (in Rupees) for a small company (which includes monthly gross salary, total deductions, and final net pay), provide a brief, easy-to-understand financial summary for the business owner.
        Then, provide one single, actionable piece of financial advice.
        Format the response in markdown. Start with a "Financial Summary" heading, followed by the summary, and then a "Financial Advice" heading, followed by the advice.
        Data: ${JSON.stringify(payrollDataForPrompt)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // A simple markdown to HTML converter
        let htmlContent = response.text
            .replace(/# Financial Summary/g, '<h3>Financial Summary</h3>')
            .replace(/# Financial Advice/g, '<h3>Financial Advice</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\n/g, '<br>'); // New lines
        
        summaryOutput.innerHTML = htmlContent;

    } catch (error) {
        console.error("Error generating summary:", error);
        summaryOutput.innerHTML = '<p class="error">Sorry, we were unable to generate the summary. Please try again.</p>';
    } finally {
        loader.style.display = 'none';
        generateSummaryBtn.disabled = false;
    }
}

// Event Listeners
addEmployeeForm.addEventListener('submit', addEmployee);
calculatePayrollBtn.addEventListener('click', calculatePayroll);
generateSummaryBtn.addEventListener('click', generateFinancialSummary);
downloadAllBtn.addEventListener('click', downloadAllSlips);
previewAllBtn.addEventListener('click', previewAllSlips);
searchEmployeeInput.addEventListener('input', renderEmployeeList);
editEmployeeForm.addEventListener('submit', saveEmployeeChanges);
cancelEditBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', (event) => {
    if (event.target === editModal) {
        closeEditModal();
    }
});


// Initial Render
renderEmployeeList();