package org.citopt.connde.web.rest;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

import java.util.List;

import org.citopt.connde.RestConfiguration;
import org.citopt.connde.domain.access_control.ACAccessRequest;
import org.citopt.connde.domain.access_control.ACAccessType;
import org.citopt.connde.domain.device.Device;
import org.citopt.connde.error.EntityAlreadyExistsException;
import org.citopt.connde.error.EntityNotFoundException;
import org.citopt.connde.repository.DeviceRepository;
import org.citopt.connde.service.UserEntityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.Link;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import io.swagger.annotations.ApiResponse;
import io.swagger.annotations.ApiResponses;

/**
 * REST Controller for managing {@link Device}s.
 * 
 * @author Jakob Benz
 */
@RestController
@RequestMapping(RestConfiguration.BASE_PATH + "/devices")
@Api(tags = { "Devices" })
public class RestDeviceController {
	
    @Autowired
    private DeviceRepository deviceRepository;
    
    @Autowired
    private UserEntityService userEntityService;
    
    
	@GetMapping(produces = "application/hal+json")
	@ApiOperation(value = "Retrieves all existing device entities available for the requesting entity.", produces = "application/hal+json")
	@ApiResponses({
			@ApiResponse(code = 200, message = "Success!"),
			@ApiResponse(code = 404, message = "Device or requesting user not found!") })
    public ResponseEntity<PagedModel<EntityModel<Device>>> all(
    		@RequestHeader("X-MBP-Access-Request") String accessRequestHeader,
    		@ApiParam(value = "Page parameters", required = true) Pageable pageable) {
		// Parse the access-request information
		ACAccessRequest accessRequest = ACAccessRequest.valueOf(accessRequestHeader);
		
    	// Retrieve the corresponding devices (includes access-control)
    	List<Device> devices = userEntityService.getPageWithPolicyCheck(deviceRepository, ACAccessType.READ, accessRequest, pageable);
    	
    	// Create self link
    	Link selfLink = linkTo(methodOn(getClass()).all(accessRequestHeader, pageable)).withSelfRel();
    	
    	return ResponseEntity.ok(userEntityService.entitiesToPagedModel(devices, selfLink, pageable));
    }
    
    @GetMapping(path = "/{deviceId}", produces = "application/hal+json")
    @ApiOperation(value = "Retrieves an existing device entity identified by its id if it's available for the requesting entity.", produces = "application/hal+json")
    @ApiResponses({ @ApiResponse(code = 200, message = "Success!"),
    		@ApiResponse(code = 401, message = "Not authorized to access the device!"),
    		@ApiResponse(code = 404, message = "Device or requesting user not found!") })
    public ResponseEntity<EntityModel<Device>> one(
    		@RequestHeader("X-MBP-Access-Request") String accessRequestHeader,
    		@PathVariable("deviceId") String deviceId,
    		@ApiParam(value = "Page parameters", required = true) Pageable pageable) throws EntityNotFoundException {
		// Parse the access-request information
		ACAccessRequest accessRequest = ACAccessRequest.valueOf(accessRequestHeader);
		
    	// Retrieve the corresponding device (includes access-control)
    	Device device = userEntityService.getForIdWithPolicyCheck(deviceRepository, deviceId, ACAccessType.READ, accessRequest);
    	return ResponseEntity.ok(userEntityService.entityToEntityModel(device));
    }
    
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = "application/hal+json")
    @ApiOperation(value = "Retrieves an existing device entity identified by its id if it's available for the requesting entity.", produces = "application/hal+json")
    @ApiResponses({ @ApiResponse(code = 200, message = "Success!"), @ApiResponse(code = 409, message = "Device already exists!") })
    public ResponseEntity<EntityModel<Device>> create(
    		@ApiParam(value = "Page parameters", required = true) Pageable pageable,
    		@RequestBody Device device) throws EntityAlreadyExistsException, EntityNotFoundException {
    	// Save device in the database
    	Device createdDevice = userEntityService.create(deviceRepository, device);
    	return ResponseEntity.ok(userEntityService.entityToEntityModel(createdDevice));
    }
    
    @DeleteMapping(path = "/{deviceId}")
    @ApiOperation(value = "Deletes an existing device entity identified by its id if it's available for the requesting entity.")
    @ApiResponses({ @ApiResponse(code = 204, message = "Success!"),
    		@ApiResponse(code = 401, message = "Not authorized to delete the device!"),
    		@ApiResponse(code = 404, message = "Device or requesting user not found!") })
    public ResponseEntity<Void> delete(
    		@RequestHeader("X-MBP-Access-Request") String accessRequestHeader,
    		@PathVariable("deviceId") String deviceId) throws EntityNotFoundException {
		// Parse the access-request information
		ACAccessRequest accessRequest = ACAccessRequest.valueOf(accessRequestHeader);
		
    	// Delete the device (includes access-control) 
    	userEntityService.deleteWithPolicyCheck(deviceRepository, deviceId, accessRequest);
    	return ResponseEntity.noContent().build();
    }
    
    // =====================================================================================================

//    @PostMapping(path = "/test1")
//    public ResponseEntity<EntityModel<Device>> test1() {
//    	Device device = deviceRepository.findById("5f30fe9f8bdd050a72e9f636").get();
//    	User user = userRepository.findOneByUsername("admin").get();
//		
//		List<ACAccessType> acs = new ArrayList<>();
//		acs.add(ACAccessType.READ);
//		IACCondition c = new ACSimpleCondition<String>("C1", ACArgumentFunction.EQUALS, new ACConditionSimpleAttributeArgument<>(ACEntityType.REQUESTING_ENTITY, "a1"), new ACConditionSimpleValueArgument<String>("v1"));
//		List<IACEffect<?>> effects = new ArrayList<>();
////		effects.add(new ACDoubleAccuracyEffect("Effect 1", 10, 5));
//		ACPolicy p = new ACPolicy("P1", 1, acs, c, effects, user);
//		p = policyRepository.save(p);
//		device.getAccessControlPolicies().add(p);
//		device = deviceRepository.save(device);
//    	
//    	return ResponseEntity.ok(deviceToEntityModel(device));
//    }
    
    
//  public static void main(String[] args) throws JsonProcessingException {
//  	List<ACAttribute<? extends Comparable<?>>> attributes = new ArrayList<>();
//  	attributes.add(new ACAttribute<String>(ACDataType.ALPHABETIC, "firstName", "Jakob"));
//  	attributes.add(new ACAttribute<String>(ACDataType.ALPHABETIC, "lastName", "Benz"));
//		ACAccessRequest r = new ACAccessRequest(attributes);
//		System.out.println(new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsString(r));
//	}
    
}