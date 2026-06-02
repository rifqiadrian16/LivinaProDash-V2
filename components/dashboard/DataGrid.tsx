import React, { memo } from "react";
import { Text, View } from "react-native";
import { styles } from "../../styles/dashboard.styles";
import SensorCard from "./SensorCard";

// 1. Bungkus dengan memo()
const DataGrid = memo(({ data, instFuel, avgFuel }: any) => {
  return (
    <>
      <View style={styles.fuelRow}>
        <View style={styles.fuelItem}>
          <Text style={styles.fuelLabel}>INST. FUEL</Text>
          <Text style={styles.fuelValue}>
            {instFuel.toFixed(1)} <Text style={styles.unitSmall}>km/L</Text>
          </Text>
        </View>
        <View style={styles.fuelItem}>
          <Text style={styles.fuelLabel}>AVG. FUEL</Text>
          <Text style={styles.fuelValue}>
            {avgFuel.toFixed(1)} <Text style={styles.unitSmall}>km/L</Text>
          </Text>
        </View>
      </View>
      <View style={styles.gridContainer}>
        <SensorCard
          icon="flash"
          label="VOLTAGE"
          value={`${data.v.toFixed(1)}V`}
          color="#f1c40f"
        />
        <SensorCard
          icon="leaf"
          label="MAF"
          value={`${data.m.toFixed(1)} g/s`}
          color="#00ff88"
        />
        <SensorCard
          icon="thermometer"
          label="COOLANT"
          value={`${data.t}°C`}
          color="#ff4444"
        />
        <SensorCard
          icon="snow"
          label="INTAKE"
          value={`${data.i}°C`}
          color="#3498db"
        />
        <SensorCard
          icon="timer"
          label="TIMING"
          value={`${data.tm}°`}
          color="#9b59b6"
        />
        <SensorCard
          icon="speedometer"
          label="THROTTLE"
          value={`${data.th}%`}
          color="#e67e22"
        />
      </View>
      <View style={styles.trimContainer}>
        <View style={styles.trimBox}>
          <Text style={styles.trimLabel}>STFT</Text>
          <Text style={styles.trimValue}>{data.st.toFixed(1)}%</Text>
        </View>
        <View style={styles.trimBox}>
          <Text style={styles.trimLabel}>LTFT</Text>
          <Text style={styles.trimValue}>{data.lt.toFixed(1)}%</Text>
        </View>
      </View>
    </>
  );
});

// 2. Export komponen
export default DataGrid;
