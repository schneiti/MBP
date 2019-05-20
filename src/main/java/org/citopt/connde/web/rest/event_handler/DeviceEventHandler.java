package org.citopt.connde.web.rest.event_handler;

import org.citopt.connde.domain.component.Actuator;
import org.citopt.connde.domain.component.Sensor;
import org.citopt.connde.domain.device.Device;
import org.citopt.connde.domain.monitoring.MonitoringAdapter;
import org.citopt.connde.domain.monitoring.MonitoringComponent;
import org.citopt.connde.domain.valueLog.ValueLog;
import org.citopt.connde.repository.ActuatorRepository;
import org.citopt.connde.repository.SensorRepository;
import org.citopt.connde.repository.ValueLogRepository;
import org.citopt.connde.repository.projection.ComponentProjection;
import org.citopt.connde.service.deploy.SSHDeployer;
import org.citopt.connde.web.rest.helper.MonitoringHelper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.rest.core.annotation.HandleBeforeDelete;
import org.springframework.data.rest.core.annotation.RepositoryEventHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

/**
 * Event handler for operations that are performed on devices.
 */
@Component
@RepositoryEventHandler(Device.class)
public class DeviceEventHandler {
    @Autowired
    private ActuatorRepository actuatorRepository;

    @Autowired
    private SensorRepository sensorRepository;

    @Autowired
    private ValueLogRepository valueLogRepository;

    @Autowired
    private MonitoringHelper monitoringHelper;

    @Autowired
    private SSHDeployer sshDeployer;

    /**
     * Called in case a device is supposed to be deleted. This method then takes care of deleting
     * the components which use this device and the associated value logs.
     *
     * @param device The device that is supposed to be deleted
     */
    @HandleBeforeDelete
    public void beforeDeviceDelete(Device device) throws IOException {
        //Get device id
        String deviceId = device.getId();

        //Find actuators that use this device and iterate over them
        List<ComponentProjection> affectedActuators = actuatorRepository.findAllByDeviceId(deviceId);
        for (ComponentProjection projection : affectedActuators) {
            Actuator actuator = actuatorRepository.findOne(projection.getId());

            //Undeploy actuator if running
            sshDeployer.undeployIfRunning(actuator);

            //Get affected value logs and delete them
            List<ValueLog> valueLogs = valueLogRepository.findListByIdref(actuator.getId());
            valueLogRepository.delete(valueLogs);

            //Delete actuator
            actuatorRepository.delete(projection.getId());
        }

        //Find sensor that use this device and iterate over them
        List<ComponentProjection> affectedSensors = sensorRepository.findAllByDeviceId(deviceId);
        for (ComponentProjection projection : affectedSensors) {
            Sensor sensor = sensorRepository.findOne(projection.getId());

            //Undeploy sensor if running
            sshDeployer.undeployIfRunning(sensor);

            //Get affected value logs and delete them
            List<ValueLog> valueLogs = valueLogRepository.findListByIdref(sensor.getId());
            valueLogRepository.delete(valueLogs);

            //Delete sensor
            sensorRepository.delete(projection.getId());
        }

        //Get all monitoring adapters that are compatible to the device
        List<MonitoringAdapter> compatibleMonitoringAdapters = monitoringHelper.getCompatibleAdapters(device);

        //Iterate over the compatible monitoring adapters
        for (MonitoringAdapter adapter : compatibleMonitoringAdapters) {
            //Create monitoring component from monitoring adapter and device
            MonitoringComponent monitoringComponent = new MonitoringComponent(adapter, device);

            //Undeploy monitoring component if necessary
            sshDeployer.undeployIfRunning(monitoringComponent);

            //Get affected value logs and delete them
            List<ValueLog> valueLogs = valueLogRepository.findListByIdref(monitoringComponent.getId());
            valueLogRepository.delete(valueLogs);
        }
    }
}