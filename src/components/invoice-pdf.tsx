"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

type InvoicePdfProps = {
  invoice: {
    invoice_number: string | null;
    status: string;
    payment_account: "product" | "equipment" | null;
    currency: string;
    invoice_date: string;
    due_date: string | null;
    subtotal: number;
    vat_enabled: boolean;
    vat_rate: number;
    vat_amount: number;
    total: number;
    customers: {
      company_name: string;
      contact_name: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
    } | null;
  };
  items: {
    id: string;
    description: string;
    quantity: number;
    uom: string;
    unit_price: number;
    line_total: number;
  }[];
};

const navy = "#142B49";
const muted = "#64748B";

const styles = StyleSheet.create({
  page: {
    padding: 26,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: navy,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    paddingBottom: 18,
  },
  logo: {
    width: 145,
    height: 72,
    objectFit: "contain",
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "right",
  },
  invoiceNumber: {
    marginTop: 6,
    fontWeight: "bold",
    textAlign: "right",
  },
  date: {
    marginTop: 5,
    color: muted,
    textAlign: "right",
  },
  company: {
    marginTop: 8,
    color: muted,
  },
  columns: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  column: {
    width: "48%",
  },
  heading: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  bold: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  muted: {
    color: muted,
    marginBottom: 6,
  },
  customerDetails: {
    // fontSize: 8.5,
    lineHeight: 1.15,
    marginBottom: 1,
    color: muted,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  section: {
    marginTop: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#DCEAF7",
    color: "#142B49",
    padding: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  serial: {
    width: "6%",
    textAlign: "center",
  },
  description: {
    width: "30%",
  },
  quantity: {
    width: "10%",
    textAlign: "right",
  },
  uom: {
    width: "10%",
    textAlign: "center",
  },
  price: {
    width: "22%",
    textAlign: "right",
  },
  amount: {
    width: "22%",
    textAlign: "right",
  },
  totals: {
    width: "50%",
    marginLeft: "50%",
    marginTop: 9,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: "#CBD5E1",
    paddingTop: 10,
    fontSize: 13,
    fontWeight: "bold",
  },
  payment: {
    borderTopWidth: 1,
    borderTopColor: "#CBD5E1",
    marginTop: 20,
    paddingTop: 15,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
    maxWidth: 310,
  },
  signatory: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  stamp: {
    width: 82,
    height: 62,
    objectFit: "contain",
    marginVertical: 4,
  },
  footer: {
    marginTop: 8,
    padding: 7,
    backgroundColor: "#F8FAFC",
    textAlign: "center",
    color: muted,
    fontSize: 8,
  },
});

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function date(value: string | null) {
  if (!value) return "—";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function InvoicePdf({ invoice, items }: InvoicePdfProps) {
  const customer = invoice.customers;

  const paymentAccount =
    invoice.payment_account === "product"
      ? {
          bank: "PremiumTrust Bank",
          number: "0010133736",
        }
      : invoice.payment_account === "equipment"
      ? {
          bank: "Providus Bank PLC",
          number: "5401773243",
        }
      : null;

  const showStamp = ["approved", "paid", "partially_paid"].includes(
    invoice.status
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Image src="/kaotheem-logo.jpg" style={styles.logo} />
          </View>

          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>
              {invoice.invoice_number || "Draft Invoice"}
            </Text>
            <Text style={styles.date}>{date(invoice.invoice_date)}</Text>
          </View>
        </View>

        {/* CUSTOMER AND INVOICE INFORMATION */}
        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.heading}>Bill To</Text>

            <Text style={styles.bold}>
              {customer?.company_name || "Unknown Customer"}
            </Text>

            {customer?.contact_name && (
              <Text style={styles.customerDetails}>
                {customer.contact_name}
              </Text>
            )}

            {customer?.email && (
              <Text style={styles.customerDetails}>{customer.email}</Text>
            )}

            {customer?.phone && (
              <Text style={styles.customerDetails}>{customer.phone}</Text>
            )}

            {customer?.address && (
              <Text style={styles.customerDetails}>{customer.address}</Text>
            )}
          </View>

          <View style={styles.column}>
            <Text style={styles.heading}>Invoice Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.muted}>Invoice Date</Text>
              <Text>{date(invoice.invoice_date)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.muted}>Due Date</Text>
              <Text>{date(invoice.due_date)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.muted}>Currency</Text>
              <Text>{invoice.currency}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.muted}>Status</Text>
              <Text>{formatStatus(invoice.status)}</Text>
            </View>
          </View>
        </View>

        {/* INVOICE ITEMS */}
        <View style={styles.section}>
          <Text style={styles.heading}>Invoice Items</Text>

          <View style={styles.tableHeader}>
            <Text style={styles.serial}>SR.NO</Text>
            <Text style={styles.description}>DESCRIPTION</Text>
            <Text style={styles.quantity}>QTY</Text>
            <Text style={styles.uom}>UOM</Text>
            <Text style={styles.price}>UNIT PRICE</Text>
            <Text style={styles.amount}>AMOUNT</Text>
          </View>

          {items.map((item, index) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.serial}>{index + 1}</Text>

              <Text style={styles.description}>{item.description}</Text>

              <Text style={styles.quantity}>{item.quantity}</Text>

              <Text style={styles.uom}>{item.uom || "PCS"}</Text>

              <Text style={styles.price}>
                {money(Number(item.unit_price), invoice.currency)}
              </Text>

              <Text style={styles.amount}>
                {money(Number(item.line_total), invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{money(Number(invoice.subtotal), invoice.currency)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.muted}>
              VAT{" "}
              {invoice.vat_enabled ? `(${invoice.vat_rate}%)` : "(Disabled)"}
            </Text>

            <Text>{money(Number(invoice.vat_amount), invoice.currency)}</Text>
          </View>

          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total</Text>
            <Text>{money(Number(invoice.total), invoice.currency)}</Text>
          </View>
        </View>

        {/* PAYMENT DETAILS */}
        {/* PAYMENT DETAILS */}
        <View style={styles.payment}>
          <Text style={styles.heading}>Payment Details</Text>

          {paymentAccount ? (
            <>
              <View style={styles.paymentRow}>
                <Text style={styles.muted}>Bank</Text>
                <Text>{paymentAccount.bank}</Text>
              </View>

              <View style={styles.paymentRow}>
                <Text style={styles.muted}>Account Name</Text>
                <Text>Kaotheem Energy Services Ltd</Text>
              </View>

              <View style={styles.paymentRow}>
                <Text style={styles.muted}>Account Number</Text>
                <Text>{paymentAccount.number}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.muted}>
              No payment account was selected for this invoice.
            </Text>
          )}

          <View style={styles.signatory}>
            <Text style={styles.heading}>Authorised Signatory</Text>

            {showStamp && (
              <Image src="/kaotheem-stamp.png" style={styles.stamp} />
            )}

            <Text style={styles.bold}>Jimoh Ibrahim</Text>

            <Text style={styles.muted}>Business Development Manager</Text>
          </View>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          Kaotheem Energy Services Ltd. All rights reserved.
        </Text>
      </Page>
    </Document>
  );
}
