import React from "react";
import { Text, View } from "react-native";
import { styles } from "../../styles/dashboard.styles";

export default function MainGauges({ rpm, speed }: any) {
  return (
    <View style={styles.gaugeContainerRow}>
      <View style={styles.gaugeWrapper}>
        <View
          style={[
            styles.mainRing,
            { borderColor: rpm > 5000 ? "#ff4444" : "#111" },
          ]}
        >
          <Text style={styles.gaugeValueText}>{rpm}</Text>
          <Text style={styles.gaugeUnitText}>RPM</Text>
        </View>
        <View style={styles.rpmTrackSmall}>
          <View
            style={[
              styles.rpmFillSmall,
              { width: `${Math.min((rpm / 7000) * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.helperText}>RPM</Text>
      </View>

      <View style={styles.gaugeWrapper}>
        <View style={styles.mainRing}>
          <Text style={styles.gaugeValueText}>{speed}</Text>
          <Text style={styles.gaugeUnitText}>KM/H</Text>
        </View>
        <Text style={styles.helperText}>SPEED</Text>
      </View>
    </View>
  );
}
