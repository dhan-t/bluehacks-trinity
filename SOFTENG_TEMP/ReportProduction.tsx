import React, { useState, useEffect } from "react";
import { useProductionData } from "../../hooks/useProductionData";
import { useDataWorkOrder } from "../../hooks/useDataWorkOrder";
import "./ReportProduction.css";
import "../components/global.css";
import Header from "../components/Header";

import TextField from "@mui/material/TextField";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import Chip from "@mui/material/Chip";

import CancelIcon from "@mui/icons-material/Cancel";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import Button from "@mui/material/Button";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";

import {
  Event as EventIcon,
  Person as PersonIcon,
  SmartphoneRounded as SmartphoneRoundedIcon,
} from "@mui/icons-material";

interface ProductionData {
  id?: string;
  workOrderID: string;
  dateRequested: string;
  fulfilledBy: string;
  dateFulfilled: string;
  producedQty: number;
  orderFulfilled: boolean;
  orderOnTime: boolean;
  phoneModel?: string;
}

const ReportProduction: React.FC = () => {
  const {
    productionData,
    fetchProductionData,
    addProductionData,
    updateProductionData,
    deleteProductionData,
    loading,
    error,
  } = useProductionData();

  const { workOrders } = useDataWorkOrder();

  const [formData, setFormData] = useState<ProductionData>({
    workOrderID: "",
    dateRequested: "",
    fulfilledBy: "",
    dateFulfilled: "",
    producedQty: 0,
    orderFulfilled: false,
    orderOnTime: false,
    phoneModel: "",
  });
  const [editMode, setEditMode] = useState<string | null>(null);

  useEffect(() => {
    fetchProductionData();
  }, []);

  const handleWorkOrderChange = (event: SelectChangeEvent<string>) => {
    const selectedValue = event.target.value as string;
    const selectedOrder = workOrders.find(
      (order) => order.id === selectedValue
    );

    setFormData({
      ...formData,
      workOrderID: selectedOrder?.id || "",
      dateRequested: selectedOrder?.requestDate || "",
      phoneModel: selectedOrder?.module || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formattedData = {
      workOrderID: formData.workOrderID,
      dateRequested: formData.dateRequested,
      fulfilledBy: formData.fulfilledBy,
      dateFulfilled: formData.dateFulfilled,
      producedQty: formData.producedQty,
      orderFulfilled: formData.producedQty >= 100,
      orderOnTime:
        new Date(formData.dateFulfilled) <= new Date(formData.dateRequested),
    };

    if (editMode) {
      await updateProductionData({ ...formattedData, id: editMode });
    } else {
      await addProductionData(formattedData);
    }
    setFormData({
      workOrderID: "",
      dateRequested: "",
      fulfilledBy: "",
      dateFulfilled: "",
      producedQty: 0,
      orderFulfilled: false,
      orderOnTime: false,
      phoneModel: "",
    });
    setEditMode(null);
  };

  const handleEdit = (item: ProductionData) => {
    setFormData({
      ...item,
      dateFulfilled: item.dateFulfilled.split("T")[0],
    });
    setEditMode(item.id || null);
  };

  const handleDelete = async (id: string) => {
    await deleteProductionData(id);
    fetchProductionData();
  };

  const rows = productionData.map((item, index) => ({
    ...item,
    id: item.id || index,
    index: index + 1,
  }));

  const columns: GridColDef[] = [
    { field: "index", headerName: "ID", width: 50 },
    { field: "id", headerName: "Request ID", flex: 1, sortable: true },
    {
      field: "workOrderID",
      headerName: "Work Order ID",
      flex: 1,
      sortable: true,
    },
    {
      field: "dateRequested",
      headerName: "Date Requested",
      flex: 1,
      sortable: true,
    },
    {
      field: "dateFulfilled",
      headerName: "Date Fulfilled",
      flex: 1,
      sortable: true,
    },
    {
      field: "quantityProduced",
      headerName: "Produced Qty",
      flex: 1,
      sortable: true,
    },
    {
      field: "orderFulfilled",
      headerName: "Order Fulfilled?",
      flex: 1,
      sortable: true,
      renderCell: (params) => (params.row.orderFulfilled ? "✅" : "❌"),
    },
    {
      field: "orderOnTime",
      headerName: "Order On Time?",
      flex: 1,
      sortable: true,
      renderCell: (params) => (params.row.orderOnTime ? "✅" : "❌"),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => handleEdit(params.row)}
          >
            Edit
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<DeleteIcon />}
            onClick={() => handleDelete(params.row.id)}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];

  const paginationModel = { page: 0, pageSize: 5 };
  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="main-div">
      <Header />

      <div className="form-and-card">
        <div className="form-holder">
          <form onSubmit={handleSubmit} className="form">
            <h2>{editMode ? "Edit report" : "Report production"}</h2>

            <div className="form-group">
              <FormControl fullWidth variant="outlined">
                <InputLabel>Select Work Order</InputLabel>
                <Select
                  value={formData.workOrderID}
                  onChange={handleWorkOrderChange}
                  label="Work Order ID"
                  required
                >
                  <MenuItem value="">
                    <em>Select Work Order</em>
                  </MenuItem>
                  {workOrders.map((order) => (
                    <MenuItem key={order.id} value={order.id}>
                      {order.id} - {order.module}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="form-group">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Date Requested"
                  value={
                    formData.dateRequested
                      ? dayjs(formData.dateRequested)
                      : null
                  }
                  onChange={(newValue) =>
                    setFormData({
                      ...formData,
                      dateRequested: newValue
                        ? newValue.format("YYYY-MM-DD")
                        : "",
                    })
                  }
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </div>

            <div className="form-group">
              <TextField
                label="Fulfilled By"
                variant="outlined"
                type="text"
                value={formData.fulfilledBy}
                onChange={(e) =>
                  setFormData({ ...formData, fulfilledBy: e.target.value })
                }
                required
                fullWidth
              />
            </div>

            <div className="form-group">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Date Fulfilled"
                  value={
                    formData.dateFulfilled
                      ? dayjs(formData.dateFulfilled)
                      : null
                  }
                  onChange={(newValue) =>
                    setFormData({
                      ...formData,
                      dateFulfilled: newValue
                        ? newValue.format("YYYY-MM-DD")
                        : "",
                    })
                  }
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </div>

            <div className="form-group">
              <TextField
                label="Produced Quantity"
                variant="outlined"
                type="number"
                value={formData.producedQty}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    producedQty: parseInt(e.target.value),
                  })
                }
                required
                fullWidth
              />
            </div>

            <Button
              type="submit"
              variant="contained"
              disableElevation
              color={editMode ? "primary" : "success"}
              startIcon={editMode ? <EditIcon /> : <SaveIcon />}
            >
              {editMode ? "Update" : "Add"}
            </Button>
            {editMode && (
              <Button
                type="button"
                variant="contained"
                color="error"
                disableElevation
                startIcon={<CancelIcon />}
                onClick={() => setEditMode(null)}
              >
                Cancel
              </Button>
            )}
          </form>
        </div>

        <div id="report-preview" className="preview-card">
          <h2 className="preview-title" id="report-title">
            Report Preview
          </h2>

          <div className="preview-icon">
            <SmartphoneRoundedIcon sx={{ fontSize: 300, color: "#E65100" }} />
          </div>

          <div className="preview-details">
            <div>
              <h2 id="report-module-code">
                {formData.phoneModel || "Phone Model"}
              </h2>
              <h3 id="report-module-desc">
                {formData.dateRequested || "Date Requested"}
              </h3>
            </div>

            <div className="chip-holder">
              <Chip
                label={
                  formData.producedQty
                    ? `${formData.producedQty} pcs`
                    : "Produced Qty"
                }
                sx={{
                  fontWeight: "medium",
                  backgroundColor: "#FFCCBC",
                  color: "#BF360C",
                }}
              />

              <Chip
                icon={
                  <SmartphoneRoundedIcon
                    sx={{ color: "#e65100", fontSize: 25, paddingLeft: 1 }}
                  />
                }
                label={formData.phoneModel || "Phone Model"}
                sx={{
                  fontWeight: "medium",
                  backgroundColor: "#FFF3E0",
                  color: "#E65100",
                }}
              />

              <Chip
                icon={
                  <EventIcon
                    sx={{ color: "#E65100", fontSize: 25, paddingLeft: 1 }}
                  />
                }
                label={formData.dateFulfilled || "Date Fulfilled"}
                sx={{
                  fontWeight: "medium",
                  backgroundColor: "#FFF3E0",
                  color: "#E65100",
                }}
              />
            </div>

            <div className="chip-holder">
              <Chip
                icon={
                  <PersonIcon
                    sx={{ color: "#e65100", fontSize: 25, paddingLeft: 1 }}
                  />
                }
                label={formData.fulfilledBy || "Fulfilled By"}
                sx={{
                  fontWeight: "medium",
                  backgroundColor: "#FFF3E0",
                  color: "#E65100",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="styled-table">
        <h2>Production Reports</h2>
        <DataGrid
          checkboxSelection
          rows={rows}
          columns={columns}
          initialState={{ pagination: { paginationModel } }}
          pageSizeOptions={[5, 10, 50, 100]}
          sx={{
            backgroundColor: "white",
            border: "none",
            "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f5f5f5" },
          }}
        />
      </div>
    </div>
  );
};

export default ReportProduction;
