package org.citopt.connde.repository.projection;

import org.citopt.connde.domain.device.Device;
import org.citopt.connde.domain.user.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.rest.core.config.Projection;

/**
 *
 * @author rafaelkperes
 */
@Projection(name = "list", types = Device.class)
public interface DeviceListProjection {

    String getId();

    String getName();
    
    String getComponentType();

    String getMacAddress();
    
    String getIpAddress();
    
    String getDate();
    
    String getUsername();

    User getOwner();
}
