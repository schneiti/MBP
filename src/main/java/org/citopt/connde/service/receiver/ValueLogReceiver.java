package org.citopt.connde.service.receiver;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

import org.apache.commons.codec.binary.Base64;
import org.citopt.connde.service.settings.SettingsService;
import org.citopt.connde.service.settings.model.BrokerLocation;
import org.citopt.connde.service.settings.model.Settings;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.ContextStartedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Background service that receives incoming MQTT value log messages of that comply to certain topics. The service implements the observer pattern which allows other other components to register
 * themselves to the ValueLogReceiver and get notified when a new value message arrives.
 */
@Service
public class ValueLogReceiver {
	//Set of MQTT topics to subscribe to
	private static final String[] SUBSCRIBE_TOPICS = {"device/#", "sensor/#", "actuator/#", "monitoring/#"};
	//URL frame of the broker to use (protocol and port, address will be filled in)
	private static final String BROKER_URL = "tcp://%s:1883";
	//Client id that is supposed to be assigned to the client instance
	private static final String CLIENT_ID = "root-server";

	//Autowired components
	private SettingsService settingsService;

	//Stores the reference of the mqtt client
	private MqttClient mqttClient = null;

	//Set ob observers that want to be notified about incoming value logs
	private Set<ValueLogReceiverObserver> observerSet;

	/**
	 * Initializes the value logger service.
	 *
	 * @param settingsService Settings service that manages the application settings
	 */
	@Autowired
	public ValueLogReceiver(SettingsService settingsService) {
		this.settingsService = settingsService;

		//Initialize set of observers
		observerSet = new HashSet<>();
	}

	@EventListener({ContextStartedEvent.class, ApplicationReadyEvent.class})
	public void initMqtt() {
		System.out.println("Application is ready !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		//Setup the mqtt client
		try {
			setupAndStart();
		} catch (MqttException e) {
			System.err.println("MqttException: " + e.getMessage());
		} catch (IOException e) {
			System.err.println("IOException: " + e.getMessage());
		}
	}

	/**
	 * Registers an observer at the ValueLogReceiver which then will be notified about incoming value logs.
	 *
	 * @param observer The observer to register
	 */
	public void registerObserver(ValueLogReceiverObserver observer) {
		//Sanity check
		if (observer == null) {
			throw new IllegalArgumentException("Observer must not be null.");
		}

		//Add observer to set
		observerSet.add(observer);
	}

	/**
	 * Unregisters an observer from the ValueLogReceiver which then will not be notified anymore about incoming value logs.
	 *
	 * @param observer The observer to unregister
	 */
	public void unregisterObserver(ValueLogReceiverObserver observer) {
		//Sanity check
		if (observer == null) {
			throw new IllegalArgumentException("Observer must not be null.");
		}

		//Remove observer from set
		observerSet.remove(observer);
	}

	/**
	 * Unregisters all observers.
	 */
	public void clearObservers() {
		observerSet.clear();
	}

	/**
	 * Initializes, configures and starts the ValueLogger. The required parameters are derived from the SettingsService component. If the value logger is already running, it is terminated,
	 * disconnected and restarted with new settings (if they have changed in the meanwhile).
	 *
	 * @throws MqttException In case of an error during execution of mqtt operations
	 * @throws IOException   In case of an I/O issue
	 */
	public void setupAndStart() throws MqttException, IOException {
		//Disconnect the old mqtt client if already connected
		if ((mqttClient != null) && (mqttClient.isConnected())) {
			mqttClient.disconnectForcibly();
		}

		//Stores the address of the desired mqtt broker
		String brokerAddress = "localhost";

		//Determine from settings if a remote broker should be used instead
		Settings settings = settingsService.getSettings();
		if (settings.getBrokerLocation().equals(BrokerLocation.REMOTE)) {
			//Retrieve IP address of external broker from settings
			brokerAddress = settings.getBrokerIPAddress();
		}

		//Instantiate memory persistence
		MemoryPersistence persistence = new MemoryPersistence();


		RestTemplate restTemplate = new RestTemplate();
		HttpHeaders httpHeaders = createHeaders("mbp", "mbp-platform");
		HttpEntity<String> request = new HttpEntity<>(httpHeaders);
		String url = "http://192.168.209.207:8080/MBP/oauth/token?grant_type=client_credentials";
		ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, request, String.class);
		String accessToken = null;
		System.out.println("###### response " + response.getBody());
		try {
			JSONObject body = new JSONObject(response.getBody().toString());
			accessToken = body.getString("access_token");
			System.out.println("############## Token: " + accessToken);
		} catch (JSONException e) {
			e.printStackTrace();
		}

		//Create new mqtt client with the full broker URL
		mqttClient = new MqttClient(String.format(BROKER_URL, brokerAddress), CLIENT_ID, persistence);
		MqttConnectOptions connectOptions = new MqttConnectOptions();
		connectOptions.setCleanSession(true);
        connectOptions.setUserName(accessToken);
		connectOptions.setPassword("any".toCharArray());

		//Connect and subscribe to the topics
		mqttClient.connect(connectOptions);
		mqttClient.subscribe(SUBSCRIBE_TOPICS);

		//Create new callback handler for messages and register it
		MqttCallback callback = new ValueLogReceiverArrivalHandler(observerSet);
		mqttClient.setCallback(callback);
	}

	private HttpHeaders createHeaders(String username, String password) {
		return new HttpHeaders() {{
			String auth = username + ":" + password;
			byte[] encodedAuth = Base64.encodeBase64(
					auth.getBytes(StandardCharsets.US_ASCII));
			String authHeader = "Basic " + new String(encodedAuth);
			set("Authorization", authHeader);
		}};
	}
}