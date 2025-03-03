import React, { useState } from "react";
import { useLogistics } from "../../hooks/useLogistics";
import "./RequestModule.css";
import Header from "../components/Header";
import "../components/global.css";

import TextField from "@mui/material/TextField";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import Select from "@mui/material/Select";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import { SelectChangeEvent } from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import SendIcon from "@mui/icons-material/Send";
import Button from "@mui/material/Button";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  CameraAltRounded as CameraIcon,
  HomeRounded as RectangleIcon,
  VolumeUpRounded as SpeakerIcon,
  AodRounded as ScreenIcon,
  BatteryChargingFullRounded as BatteryIcon,
  MemoryRounded as ChipIcon,
  WifiRounded as WifiIcon,
  BoltRounded as BoltIcon,
  ShieldRounded as ShieldIcon,
  VibrationRounded as VibrationIcon,
  RadarRounded as RadarIcon,
  HeadphonesRounded as HeadphonesIcon,
  TouchAppRounded as TouchIcon,
  ToggleOnRounded as ToggleIcon,
  AirRounded as FanIcon,
  PlaceOutlined as PlaceOutlinedIcon,
  Event as EventIcon,
  Person as PersonIcon,
  WidgetsRounded as WidgetsRoundedIcon,
} from "@mui/icons-material";

interface ModuleOption {
  code: string;
  description: string;
  icon: React.ReactNode;
}

interface FactoryNames {
  name: string;
  description: string;
}

const moduleOptions: ModuleOption[] = [
  {
    code: "CMR123",
    description: "Camera module",
    icon: <CameraIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "HSN123",
    description: "Housing module",
    icon: <RectangleIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "SPK123",
    description: "Speaker module",
    icon: <SpeakerIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "DSP123",
    description: "Display module",
    icon: <ScreenIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "BTRY123",
    description: "Battery module",
    icon: <BatteryIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "LGC123",
    description: "Logic module",
    icon: <ChipIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "CON123",
    description: "Connectivity module",
    icon: <WifiIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "CHG123",
    description: "Charging module",
    icon: <BoltIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "SEC123",
    description: "Security module",
    icon: <ShieldIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "HPT123",
    description: "Haptics module",
    icon: <VibrationIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "SEN123",
    description: "Sensor module",
    icon: <RadarIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "AUD123",
    description: "Audio module",
    icon: <HeadphonesIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "TCH123",
    description: "Touch module",
    icon: <TouchIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "BTN123",
    description: "Button module",
    icon: <ToggleIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
  {
    code: "COOL123",
    description: "Cooling module",
    icon: <FanIcon sx={{ fontSize: 300, color: "#33691e" }} />,
  },
];

const factoryNames = [
  {
    name: "Factory A",
    description: "Chassis and Frame Assembly",
  },
  {
    name: "Factory B",
    description: "Battery Production and Testing",
  },
  {
    name: "Factory C",
    description: "Screen Manufacturing and Quality Control",
  },
  {
    name: "Factory D",
    description: "Camera Module Assembly",
  },
  {
    name: "Factory E",
    description: "Logic Board and Chip Integration",
  },
  {
    name: "Factory F",
    description: "Final Assembly and Packaging",
  },
  {
    name: "Factory G",
    description: "Connectivity Module Production",
  },
  {
    name: "Factory H",
    description: "Audio and Speaker Installation",
  },
  {
    name: "Factory I",
    description: "Security Features and Software Installation",
  },
  {
    name: "Factory J",
    description: "Cooling System and Haptics Integration",
  },
];
const RequestModule: React.FC = () => {
  const { requests, submitRequest, loading, error } = useLogistics();
  const [formData, setFormData] = useState({
    module: "",
    requestedBy: "",
    description: "",
    recipient: "",
    requestDate: "",
    quantity: 0,
  });

  const handleModuleChange = (event: SelectChangeEvent<string>) => {
    const selectedOption = moduleOptions.find(
      (option) => option.code === event.target.value
    );

    setFormData({
      ...formData,
      module: selectedOption?.code || "",
      description: selectedOption?.description || "",
    });
  };

  const handleFactoryChange = (event: SelectChangeEvent<string>) => {
    const selectedFactory = factoryNames.find(
      (factory) => factory.name === event.target.value
    );

    setFormData({
      ...formData,
      recipient: selectedFactory?.name || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitRequest(formData);
    setFormData({
      module: "",
      requestedBy: "",
      description: "",
      recipient: "",
      requestDate: "",
      quantity: 0,
    });
  };

  const rows = requests.map((request, index) => ({
    index: index + 1, // Add index starting from 1
    id: request._id, // Use _id as the unique ID
    module: request.module,
    requestedBy: request.requestedBy,
    recipient: request.recipient, // Add recipient field
    requestDate: request.requestDate,
    status: request.status,
  }));

  const columns: GridColDef[] = [
    { field: "index", headerName: "ID", width: 20, maxWidth: 20 },
    { field: "id", headerName: "Request ID", width: 150, flex: 1 },
    { field: "module", headerName: "Module Code", width: 250, sortable: true },
    {
      field: "requestedBy",
      headerName: "Requested By",
      width: 200,
      sortable: true,
    },
    { field: "recipient", headerName: "Recipient", width: 150, sortable: true },
    {
      field: "requestDate",
      headerName: "Request Date",
      width: 200,
      sortable: true,
    },
    {
      field: "status",
      headerName: "Status",
      width: 200,
      sortable: true,
    },
  ];

  const paginationModel = { page: 0, pageSize: 5 };

  return (
    <div className="main-div">
      <Header />

      <div className="form-and-card">
        {/* Submit Request Form */}
        <div className="form-holder">
          <form onSubmit={handleSubmit} className="form">
            <h2 className="h2">Module Request</h2>
            {/*ALLCHANGE list of all modules.*/}
            <div className="form-group">
              <FormControl fullWidth required>
                <InputLabel id="module-label">Module Code</InputLabel>
                <Select
                  labelId="module-label"
                  id="module"
                  value={formData.module}
                  onChange={handleModuleChange}
                  label="Module Code"
                >
                  <MenuItem value="">
                    <em>Select Module</em>
                  </MenuItem>
                  {moduleOptions.map((option) => (
                    <MenuItem key={option.code} value={option.code}>
                      {option.code}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="form-group">
              <TextField
                type="text"
                id="description"
                label="Module name"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled
              />
            </div>
            {/*ALLCHANGE  list of all modules.*/}
            <div className="form-group">
              <TextField
                type="text"
                id="requestedBy"
                label="Requested by"
                value={formData.requestedBy}
                onChange={(e) =>
                  setFormData({ ...formData, requestedBy: e.target.value })
                }
                required
              />
            </div>

            {/*ALLCHANGE  list of all factory (autofilled recipients).*/}
            <div className="form-group">
              <FormControl fullWidth required>
                <InputLabel id="recipient-label">Recipient</InputLabel>
                <Select
                  labelId="recipient-label"
                  id="recipient"
                  value={formData.recipient}
                  onChange={handleFactoryChange}
                  label="Recipient"
                >
                  <MenuItem value="">
                    <em>Select Module</em>
                  </MenuItem>
                  {factoryNames.map((option) => (
                    <MenuItem key={option.name} value={option.name}>
                      {option.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="form-group">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Request date"
                  value={
                    formData.requestDate ? dayjs(formData.requestDate) : null
                  }
                  onChange={(newValue) =>
                    setFormData({
                      ...formData,
                      requestDate: newValue
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
                type="number"
                id="quantity"
                label="Quantity"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: parseInt(e.target.value),
                  })
                }
                required
              />
            </div>

            <Button
              type="submit"
              variant="contained"
              disableElevation
              color={"success"}
              startIcon={<SendIcon />}
            >
              {"submit"}
            </Button>
          </form>
        </div>

        <div id="request-card" className="preview-card">
          {/* Preview Title */}
          <h2 className="preview-title" id="request-title">
            Request Preview
          </h2>

          {/* Display selected module icon or a placeholder icon */}
          <div className="preview-icon">
            {formData.module ? (
              moduleOptions.find((option) => option.code === formData.module)
                ?.icon
            ) : (
              <WidgetsRoundedIcon sx={{ fontSize: 270, color: "#33691e" }} />
            )}
          </div>

          <div className="preview-details">
            <div>
              <h2 className="preview-module-code" id="request-module-code">
                {formData.module || "Module Code"}
              </h2>
              <h3 className="preview-module-desc" id="request-module-desc">
                {formData.description || "Module Description"}
              </h3>
            </div>

            <div className="chip-holder">
              {/* Quantity */}
              <Chip
                label={
                  formData.quantity ? `${formData.quantity} pc` : "Quantity"
                }
                className="preview-chip"
                id="request-chip-quantity"
              />

              {/* Recipient */}
              <Chip
                icon={
                  <PlaceOutlinedIcon
                    sx={{
                      "&&": { color: "#33691e" },
                      fontSize: 25,
                      paddingLeft: 1,
                    }}
                  />
                }
                label={formData.recipient || "Recipient"}
                sx={{
                  fontWeight: "medium",
                  backgroundColor: "#f1f8e9",
                  color: "#33691e",
                }}
                className="preview-chip"
                id="request-chip-recipient"
              />

              {/* Date */}
              <Chip
                icon={
                  <EventIcon
                    sx={{
                      "&&": { color: "#33691e" },
                      fontSize: 25,
                      paddingLeft: 1,
                    }}
                  />
                }
                label={formData.requestDate || "Date"}
                sx={{
                  fontWeight: "medium",
                  backgroundColor: "#f1f8e9",
                  color: "#33691e",
                }}
                className="preview-chip"
                id="request-chip-date"
              />
            </div>

            <div className="chip-holder">
              {/* Requester */}
              <Chip
                icon={
                  <PersonIcon
                    sx={{
                      "&&": { color: "#33691e" },
                      fontSize: 25,
                      paddingLeft: 1,
                    }}
                  />
                }
                label={formData.requestedBy || "Requester"}
                sx={{
                  fontWeight: "medium",
                  backgroundColor: "#f1f8e9",
                  color: "#33691e",
                }}
                className="preview-chip"
                id="request-chip-requester"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Existing Requests */}
      <div style={{ height: 400, width: "100%" }}>
        <h2>Existing Requests</h2>
        <DataGrid
          rows={rows}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel } }}
          pageSizeOptions={[5, 10, 50, 100]}
          sx={{
            backgroundColor: "white", // Set background to white
            border: "none", // Remove border if needed

            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f5f5f5", // Optional: header background color
            },
          }}
        />
      </div>
    </div>
  );
};

export default RequestModule;
