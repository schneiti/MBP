package org.citopt.connde.domain.monitoring;

import org.citopt.connde.domain.operator.Operator;
import org.citopt.connde.domain.entity_type.DeviceType;
import org.springframework.data.mongodb.core.mapping.DBRef;

import java.util.List;

/**
 * Similar to pure adapters, monitoring adapters wrap scripts that can be deployed on devices with the purpose
 * of monitoring the device infrastructure. In contrast to ordinary adapters, monitoring adapters are
 * associated with certain device types and can only be deployed on devices of the same type.
 */
public class MonitoringOperator extends Operator {
    @DBRef
    private List<DeviceType> deviceTypes;

    /**
     * Returns the list of device types that are associated with this adapter.
     *
     * @return The list of device types
     */
    public List<DeviceType> getDeviceTypes() {
        return deviceTypes;
    }

    /**
     * Sets the list of device types that are associated with this adapter.
     *
     * @return The list of device types to set
     */
    public void setDeviceTypes(List<DeviceType> deviceTypes) {
        this.deviceTypes = deviceTypes;
    }

    /**
     * Returns the number of device types that are associated with this adapter.
     *
     * @return The number of device types
     */
    public int getDeviceTypesNumber() {
        //Check if list has been created
        if (deviceTypes == null) {
            return 0;
        }
        return deviceTypes.size();
    }

    /**
     * Checks whether this adapter can be used for devices of a certain type.
     *
     * @param deviceTypeName The name of the device type to check
     * @return True, if the adapter is compatible; false otherwise
     */
    public boolean isCompatibleWith(String deviceTypeName){
        //Iterate over all component types of this device and check for equality
        for(DeviceType currentType : deviceTypes){
            if(currentType.getName().equals(deviceTypeName)){
                return true;
            }
        }

        //No match found
        return false;
    }
}
