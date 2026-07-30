import React, { memo } from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "../../components/AppThemeContext";
import { getDashboardStyles } from "../../styles/dashboard.styles";
import SensorCard from "./SensorCard";

const DataGrid = memo(
  ({
    data,
    instFuel,
    avgFuel,
    compact = false,
    isOverheating = false,
  }: any) => {
    const { colors } = useAppTheme();
    const styles = getDashboardStyles(colors);
    return (
      <>
        {/* KOTAK FUEL DIPERAS */}
        <View
          style={[
            styles.fuelRow,
            compact && { marginBottom: 8, paddingVertical: 8 },
          ]}
        >
          <View style={styles.fuelItem}>
            <Text style={[styles.fuelLabel, compact && { fontSize: 9 }]}>
              INST. FUEL
            </Text>
            <Text style={[styles.fuelValue, compact && { fontSize: 16 }]}>
              {instFuel.toFixed(1)}{" "}
              <Text style={[styles.unitSmall, compact && { fontSize: 10 }]}>
                km/L
              </Text>
            </Text>
          </View>
          <View style={styles.fuelItem}>
            <Text style={[styles.fuelLabel, compact && { fontSize: 9 }]}>
              AVG. FUEL
            </Text>
            <Text style={[styles.fuelValue, compact && { fontSize: 16 }]}>
              {avgFuel.toFixed(1)}{" "}
              <Text style={[styles.unitSmall, compact && { fontSize: 10 }]}>
                km/L
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          <SensorCard
            icon="flash"
            label="VOLTAGE"
            value={`${data.v.toFixed(1)}V`}
            color="#f1c40f"
            compact={compact}
          />
          <SensorCard
            icon="leaf"
            label="MAF"
            value={`${data.m.toFixed(1)} g/s`}
            color={colors.accent}
            compact={compact}
          />
          <SensorCard
            icon="thermometer"
            label="COOLANT"
            value={`${data.t}°C`}
            color={isOverheating ? "#ff0000" : "#ff4444"}
            highlight={isOverheating}
            compact={compact}
          />
          <SensorCard
            icon="snow"
            label="INTAKE"
            value={`${data.i}°C`}
            color="#3498db"
            compact={compact}
          />
          <SensorCard
            icon="timer"
            label="TIMING"
            value={`${data.tm}°`}
            color="#9b59b6"
            compact={compact}
          />
          <SensorCard
            icon="speedometer"
            label="THROTTLE"
            value={`${data.th}%`}
            color="#e67e22"
            compact={compact}
          />
        </View>

        {/* KOTAK TRIM DIPERAS */}
        <View
          style={[
            styles.trimContainer,
            compact && { marginTop: 8, paddingVertical: 6 },
          ]}
        >
          <View style={styles.trimBox}>
            <Text style={[styles.trimLabel, compact && { fontSize: 9 }]}>
              STFT
            </Text>
            <Text style={[styles.trimValue, compact && { fontSize: 14 }]}>
              {data.st.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.trimBox}>
            <Text style={[styles.trimLabel, compact && { fontSize: 9 }]}>
              LTFT
            </Text>
            <Text style={[styles.trimValue, compact && { fontSize: 14 }]}>
              {data.lt.toFixed(1)}%
            </Text>
          </View>
        </View>
      </>
    );
  },
);

export default DataGrid;
