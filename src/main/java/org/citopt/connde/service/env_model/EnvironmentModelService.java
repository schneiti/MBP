package org.citopt.connde.service.env_model;

import org.citopt.connde.domain.adapter.Adapter;
import org.citopt.connde.domain.component.*;
import org.citopt.connde.domain.device.Device;
import org.citopt.connde.domain.device.DeviceValidator;
import org.citopt.connde.domain.env_model.EnvironmentModel;
import org.citopt.connde.domain.user.User;
import org.citopt.connde.domain.user_entity.UserEntity;
import org.citopt.connde.repository.*;
import org.citopt.connde.service.UserService;
import org.citopt.connde.web.rest.response.ActionResponse;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.Errors;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Service for tasks related to environment models.
 */
@org.springframework.stereotype.Component
public class EnvironmentModelService {

    @Autowired
    private UserService userService;

    @Autowired
    private DeviceValidator deviceValidator;

    @Autowired
    private ActuatorValidator actuatorValidator;

    @Autowired
    private SensorValidator sensorValidator;

    @Autowired
    private EnvironmentModelRepository environmentModelRepository;

    @Autowired
    private AdapterRepository adapterRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private ActuatorRepository actuatorRepository;

    @Autowired
    private SensorRepository sensorRepository;

    //JSON key names
    private static final String MODEL_JSON_KEY_NODES = "nodes";
    private static final String MODEL_JSON_KEY_NODE_ID = "elementId";
    private static final String MODEL_JSON_KEY_NODE_TYPE = "nodeType";
    private static final String MODEL_JSON_KEY_NODE_COMPONENT_TYPE = "type";
    private static final String MODEL_JSON_KEY_NODE_DETAILS = "details";
    private static final String MODEL_JSON_KEY_NODE_DETAILS_NAME = "name";
    private static final String MODEL_JSON_KEY_DEVICE_IP = "ipAddress";
    private static final String MODEL_JSON_KEY_DEVICE_USERNAME = "username";
    private static final String MODEL_JSON_KEY_DEVICE_PASSWORD = "password";
    private static final String MODEL_JSON_KEY_DEVICE_RSAKEY = "rsaKey";
    private static final String MODEL_JSON_KEY_COMPONENT_ADAPTER = "adapter";
    private static final String MODEL_JSON_KEY_CONNECTIONS = "connections";
    private static final String MODEL_JSON_KEY_CONNECTION_SOURCE = "sourceId";
    private static final String MODEL_JSON_KEY_CONNECTION_TARGET = "targetId";

    //Node types of the model
    private static final String MODEL_NODE_TYPE_DEVICE = "device";
    private static final String MODEL_NODE_TYPE_ACTUATOR = "actuator";
    private static final String MODEL_NODE_TYPE_SENSOR = "sensor";

    /**
     * Unregisters (i.e. deletes) the components of an environment model.
     *
     * @param model The model whose components are supposed to be unregistered.
     */
    public void unregisterComponents(EnvironmentModel model) {
        //Sanity check
        if (model == null) {
            throw new IllegalArgumentException("Model must not be null.");
        }

        //Get entities that are associated with the model
        Set<UserEntity> entities = model.getEntitySet();

        //Santiy check
        if ((entities == null) || entities.isEmpty()) {
            return;
        }

        //Iterate over all entities and delete them
        for (UserEntity entity : entities) {
            //Check entity type
            if (entity instanceof Device) {
                deviceRepository.delete((Device) entity);
            } else if (entity instanceof Actuator) {
                actuatorRepository.delete((Actuator) entity);
            } else if (entity instanceof Sensor) {
                sensorRepository.delete((Sensor) entity);
            }
        }
    }

    /**
     * Registers the components of an environment model.
     *
     * @param model The model whose components are supposed to be registered
     * @return An action response containing the result of the registration
     */
    public ActionResponse registerComponents(EnvironmentModel model) {
        //Sanity check
        if (model == null) {
            throw new IllegalArgumentException("Model must not be null.");
        }

        //Try to parse the model
        EnvironmentModelParseResult parseResult;
        try {
            parseResult = parseModel(model);
        } catch (Exception e) {
            //Parsing failed
            return new ActionResponse(false, "Could not parse model.");
        }

        //Check if errors occurred while parsing
        if (parseResult.hasErrors()) {
            //TODO transform result errors into action response
            return new ActionResponse(false, "Could not parse model.");
        }

        //New set for remembering all registered entities
        Set<UserEntity> registeredEntitySet = new HashSet<>();

        //Unregister all components that have been previously registered
        unregisterComponents(model);

        //Register all devices
        for (Device device : parseResult.getDeviceSet()) {
            String deviceId = registerDevice(device);

            //Update device ID
            device.setId(deviceId);

            //Add to registered entity set
            registeredEntitySet.add(device);
        }

        //Get connections from parse result
        Map<Component, Device> connections = parseResult.getConnections();

        //Register all components for which a device is given
        for (Component component : parseResult.getComponentSet()) {
            //Skip component if no connection exists for it
            if (!connections.containsKey(component)) {
                continue;
            }

            //Get associated device and set it
            Device targetDevice = connections.get(component);
            component.setDevice(targetDevice);

            //Register component
            registerComponent(component);

            //Add to registered entity set
            registeredEntitySet.add(component);
        }

        //Update entity mapping of the model
        model.setEntitySet(registeredEntitySet);
        environmentModelRepository.save(model);

        return new ActionResponse(true);
    }

    private EnvironmentModelParseResult parseModel(EnvironmentModel model) throws JSONException {
        //TODO refactor this way too long method
        //Sanity check
        if (model == null) {
            throw new IllegalArgumentException("Model must not be null.");
        }

        //Create new result object
        EnvironmentModelParseResult result = new EnvironmentModelParseResult();

        //Read JSON from model
        JSONObject jsonObject = new JSONObject(model.getModelJSON());

        //Get all nodes
        JSONArray nodes = jsonObject.getJSONArray(MODEL_JSON_KEY_NODES);

        //Create entity mapping (node id -> entity object) which is required for parsing connections
        Map<String, UserEntity> entityMapping = new HashMap<>();

        //Iterate over all nodes to get all devices
        for (int i = 0; i < nodes.length(); i++) {
            //Get current node object
            JSONObject nodeObject = nodes.getJSONObject(i);

            //Get node ID
            String nodeID = nodeObject.getString(MODEL_JSON_KEY_NODE_ID);

            //Get node type
            String nodeType = nodeObject.optString(MODEL_JSON_KEY_NODE_TYPE, "");

            //Unmarshalled user entity
            UserEntity entity = null;

            //Validation errors
            Errors errors = null;

            //Differentiate between node types
            if (nodeType.equals(MODEL_NODE_TYPE_DEVICE)) {
                //Create device object from node object
                Device device = unmarshallDevice(nodeObject);
                entity = device;

                //Add device to map
                entityMapping.put(nodeID, device);

                //Add device to result
                result.addDevice(device);

                //Validate device
                errors = new BeanPropertyBindingResult(device, "device");
                deviceValidator.validate(device, errors);
            } else if (nodeType.equals(MODEL_NODE_TYPE_ACTUATOR) || nodeType.equals(MODEL_NODE_TYPE_SENSOR)) {
                //Create device object from node object
                Component component = unmarshallComponent(nodeObject);
                entity = component;

                //Add component to map
                entityMapping.put(nodeID, component);

                //Add component to result
                result.addComponent(component);

                //Validate component
                errors = new BeanPropertyBindingResult(component, "component");
                if (nodeType.equals(MODEL_NODE_TYPE_ACTUATOR)) {
                    actuatorValidator.validate(component, errors);
                } else {
                    sensorValidator.validate(component, errors);
                }
            } else {
                //Ignore other node types
                continue;
            }

            //Set entity owner
            User owner = userService.getUserWithAuthorities();
            entity.setOwner(owner);

            //Mark entity as modelled
            entity.setWasModelled(true);

            //CHeck for errors
            if (errors.hasErrors()) {
                result.addErrors(entity, errors);
            }
        }

        //Return already if there were errors
        if (result.hasErrors()) {
            return result;
        }

        //Stores all connections (source id -> target id)
        Map<String, String> connectionsMap = new HashMap<>();

        //Get all connections
        JSONArray connections = jsonObject.optJSONArray(MODEL_JSON_KEY_CONNECTIONS);

        //Iterate over the connections and parse them one by one
        for (int i = 0; i < connections.length(); i++) {
            //Get current connection object
            JSONObject connectionObject = connections.getJSONObject(i);

            //Get source and target ID
            String sourceId = connectionObject.optString(MODEL_JSON_KEY_CONNECTION_SOURCE, "");
            String targetId = connectionObject.optString(MODEL_JSON_KEY_CONNECTION_TARGET, "");

            //Only remember connection if source device and target component exist
            if (entityMapping.containsKey(sourceId) && entityMapping.containsKey(targetId)) {
                //Get source and target entity
                UserEntity sourceEntity = entityMapping.get(sourceId);
                UserEntity targetEntity = entityMapping.get(targetId);

                //Skip connection if entities are of wrong type
                if ((!(sourceEntity instanceof Device) || (!(targetEntity instanceof Component)))) {
                    continue;
                }

                //Add connection
                result.addConnection((Device) sourceEntity, (Component) targetEntity);
            }
        }

        return result;
    }

    /**
     * Registers a device in the device repository and returns its new ID.
     *
     * @param device The device to register
     * @return The generated ID of the device
     */
    private String registerDevice(Device device) {
        //Sanity check
        if (device == null) {
            throw new IllegalArgumentException("Device must not be null.");
        }

        //Insert device into repository
        Device savedEntity = deviceRepository.insert(device);

        //Get new ID and return it
        return savedEntity.getId();
    }

    /**
     * Registers a component in its dedicated repository and returns its new ID.
     *
     * @param component The component to register
     * @return The generated ID of the component
     */
    private String registerComponent(Component component) {
        //Sanity check
        if (component == null) {
            throw new IllegalArgumentException("Component must not be null.");
        }

        //Insert component into its repository and return the new id
        if (component instanceof Actuator) {
            return actuatorRepository.insert((Actuator) component).getId();
        } else {
            return sensorRepository.insert((Sensor) component).getId();
        }
    }


    private Device unmarshallDevice(JSONObject nodeObject) throws JSONException {
        //Sanity check
        if (nodeObject == null) {
            throw new IllegalArgumentException("Node object must not be null.");
        }

        //Get node details containing all relevant properties
        JSONObject deviceDetails = nodeObject.getJSONObject(MODEL_JSON_KEY_NODE_DETAILS);

        //Create new device object
        Device device = new Device();

        //Enrich device for details
        device.setName(deviceDetails.getString(MODEL_JSON_KEY_NODE_DETAILS_NAME));
        device.setComponentType(nodeObject.getString(MODEL_JSON_KEY_NODE_COMPONENT_TYPE));
        device.setIpAddress(deviceDetails.optString(MODEL_JSON_KEY_DEVICE_IP, ""));
        device.setUsername(deviceDetails.optString(MODEL_JSON_KEY_DEVICE_USERNAME, ""));
        device.setPassword(deviceDetails.optString(MODEL_JSON_KEY_DEVICE_PASSWORD, ""));
        device.setRsaKey(deviceDetails.optString(MODEL_JSON_KEY_DEVICE_RSAKEY, ""));

        //Return final device object
        return device;
    }

    private Component unmarshallComponent(JSONObject nodeObject) throws JSONException {
        //Sanity check
        if (nodeObject == null) {
            throw new IllegalArgumentException("Node object must not be null.");
        }

        //Get node type
        String nodeType = nodeObject.getString(MODEL_JSON_KEY_NODE_TYPE);

        //Get node details containing all relevant properties
        JSONObject componentDetails = nodeObject.getJSONObject(MODEL_JSON_KEY_NODE_DETAILS);

        //Create new component object (either actuator or sensor)
        Component component = nodeType.equals(MODEL_NODE_TYPE_ACTUATOR) ? new Actuator() : new Sensor();

        //Enrich component for details
        component.setName(componentDetails.getString(MODEL_JSON_KEY_NODE_DETAILS_NAME));
        component.setComponentType(nodeObject.getString(MODEL_JSON_KEY_NODE_COMPONENT_TYPE));

        //Find adapter from repository and set it
        Adapter adapter = adapterRepository.findOne(componentDetails.optString(MODEL_JSON_KEY_COMPONENT_ADAPTER));
        component.setAdapter(adapter);

        //Set a fake device for passing validation TODO
        component.setDevice(new Device());

        return component;
    }
}
